import type { RealtimeChannel } from '@supabase/supabase-js'
import { useLangStore } from '../i18n/useI18n'
import { useCustomThemeStore } from '../store/useCustomThemeStore'
import { useStatsStore } from '../store/useStatsStore'
import { useSyncStore } from '../store/useSyncStore'
import { useUserStore } from '../store/useUserStore'
import { useWidgetsStore } from '../store/useWidgetsStore'
import { useThemeStore } from '../theme/useThemeStore'
import type { Habit, Syncable } from '../types'
import { supabase } from './supabase'

export type Snapshot = Record<string, unknown>
export type MergeChoice = 'merge' | 'cloud' | 'guest'

const PREFIX = 'dashboard.'
const WEATHER_PREFIX = 'dashboard.weather.'
const TABLE = 'dashboard_state'
// Đánh dấu máy đã liên kết tài khoản nào (KHÔNG có prefix dashboard. -> không bị sync).
export const LINK_KEY = 'pd.syncAccount'

/**
 * Mỗi tab một id riêng, nhúng vào chính cột jsonb (`__client`).
 *
 * Không thể nhận ra echo của chính mình bằng cách so hash: payload realtime đi
 * qua cột `jsonb` mà Postgres KHÔNG giữ thứ tự key, nên `JSON.stringify` hai bên
 * gần như luôn khác nhau -> app tự áp lại snapshot của chính nó mỗi 2 giây và
 * ghi đè những gì người dùng vừa gõ. Dấu `__client` không có prefix `dashboard.`
 * nên `applySnapshot` bỏ qua, và không cần đổi schema.
 */
const CLIENT_ID =
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
const CLIENT_TAG = '__client'

// Các store Zustand persist cần rehydrate khi áp dữ liệu từ cloud về.
/* eslint-disable @typescript-eslint/no-explicit-any */
const PERSIST_STORES = [
  useUserStore,
  useWidgetsStore,
  useThemeStore,
  useCustomThemeStore,
  useStatsStore,
  useLangStore,
] as unknown as { persist?: { rehydrate: () => void } }[]

let applying = false
let lastPushed = ''
let pushTimer: number | null = null
let channel: RealtimeChannel | null = null
let activeUser: string | null = null
// Tăng mỗi lần start/stop: sau mỗi `await` phải kiểm tra lại, nếu không một
// `startSync` cũ vẫn chạy tiếp và ghi đè channel/interval -> leak.
let generation = 0

/** Hash ổn định: sắp khoá trước khi stringify để không phụ thuộc thứ tự key. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`
}

// ---- Snapshot localStorage ----
export function readSnapshot(): Snapshot {
  const snap: Snapshot = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(PREFIX) || k.startsWith(WEATHER_PREFIX)) continue
    try {
      snap[k] = JSON.parse(localStorage.getItem(k) as string)
    } catch {
      /* bỏ qua key hỏng */
    }
  }
  return snap
}

export function applySnapshot(data: Snapshot) {
  applying = true
  try {
    for (const [k, v] of Object.entries(data)) {
      if (!k.startsWith(PREFIX) || k.startsWith(WEATHER_PREFIX)) continue
      localStorage.setItem(k, JSON.stringify(v))
    }
    PERSIST_STORES.forEach((s) => {
      try {
        s.persist?.rehydrate()
      } catch {
        /* ignore */
      }
    })
    // Báo cho các widget dùng useLocalStorage đọc lại key.
    window.dispatchEvent(new CustomEvent('dashboard:external-change'))
  } finally {
    applying = false
  }
}

/** Xoá sạch dữ liệu dashboard trên máy này (dùng khi reset / đăng xuất). */
export function clearLocalDashboard() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
  localStorage.removeItem(LINK_KEY)
}

// ---- Merge guest + cloud ----

/**
 * Hợp nhất theo id, bản `updatedAt` mới hơn thắng, và TÔN TRỌNG tombstone.
 *
 * Bản cũ dùng union thuần nên item đã xoá ở máy A luôn sống lại từ bản sao của
 * máy B / cloud. Khi hai bên bằng `updatedAt`, tombstone thắng: thà mất một lần
 * "sống lại" hơn là xoá rồi vẫn thấy nó quay về mãi.
 */
function mergeById<T extends Syncable>(a?: T[], b?: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of [...(a ?? []), ...(b ?? [])]) {
    if (!item || typeof item.id !== 'string') continue
    const cur = map.get(item.id)
    if (!cur) {
      map.set(item.id, item)
      continue
    }
    const curAt = cur.updatedAt ?? 0
    const newAt = item.updatedAt ?? 0
    if (newAt > curAt) map.set(item.id, item)
    else if (newAt === curAt && item.deletedAt && !cur.deletedAt)
      map.set(item.id, item)
  }
  return [...map.values()]
}

function mergeHabits(a?: Habit[], b?: Habit[]): Habit[] {
  const map = new Map<string, Habit>()
  for (const h of [...(a ?? []), ...(b ?? [])]) {
    if (!h || typeof h.id !== 'string') continue
    const cur = map.get(h.id)
    if (!cur) {
      map.set(h.id, h)
      continue
    }
    const newer = (h.updatedAt ?? 0) >= (cur.updatedAt ?? 0) ? h : cur
    const older = newer === h ? cur : h
    const created = [newer.createdAt, older.createdAt].filter(
      (v): v is number => typeof v === 'number',
    )
    map.set(h.id, {
      ...newer,
      // Tick ở hai máy đều phải được giữ -> hợp nhất map `done`.
      done: { ...(older.done ?? {}), ...(newer.done ?? {}) },
      ...(created.length ? { createdAt: Math.min(...created) } : {}),
      deletedAt: newer.deletedAt,
    })
  }
  return [...map.values()]
}

type StatsWrap = {
  state?: { pomodoros?: Record<string, number>; todosDone?: Record<string, number> }
  version?: number
}
function mergeCounters(
  a?: Record<string, number>,
  b?: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...(b ?? {}) }
  for (const [k, v] of Object.entries(a ?? {}))
    merged[k] = Math.max(merged[k] ?? 0, v)
  return merged
}
function mergeStats(a?: StatsWrap, b?: StatsWrap): StatsWrap | undefined {
  if (!a && !b) return undefined
  return {
    state: {
      pomodoros: mergeCounters(a?.state?.pomodoros, b?.state?.pomodoros),
      todosDone: mergeCounters(a?.state?.todosDone, b?.state?.todosDone),
    },
    version: a?.version ?? b?.version ?? 0,
  }
}

/**
 * Ghi chú là chuỗi tự do, không có id để merge -> không thể chọn "bên thắng"
 * mà không mất chữ. Nối hai bản khi chúng thật sự khác nhau, nhưng nếu bản này
 * đã chứa bản kia thì lấy bản dài hơn — nếu không mỗi lần đồng bộ lại thêm một
 * dấu `---` nữa.
 */
function mergeNotes(a?: string, b?: string): string {
  const x = (a ?? '').trim()
  const y = (b ?? '').trim()
  if (!x || !y) return x || y || ''
  if (x === y) return x
  if (x.includes(y)) return x
  if (y.includes(x)) return y
  return `${x}\n\n---\n\n${y}`
}

// local = guest (máy), cloud = tài khoản. Mặc định cài đặt ưu tiên cloud,
// nhưng dữ liệu dạng danh sách thì hợp nhất.
export function mergeSnapshots(local: Snapshot, cloud: Snapshot): Snapshot {
  const out: Snapshot = { ...local, ...cloud }
  const list = (s: Snapshot, k: string) => s[k] as Syncable[] | undefined

  for (const key of [
    'dashboard.todos',
    'dashboard.bookmarks',
    'dashboard.ytPlaylist',
  ]) {
    out[key] = mergeById(list(local, key), list(cloud, key))
  }

  out['dashboard.habits'] = mergeHabits(
    local['dashboard.habits'] as Habit[],
    cloud['dashboard.habits'] as Habit[],
  )
  out['dashboard.notes'] = mergeNotes(
    local['dashboard.notes'] as string,
    cloud['dashboard.notes'] as string,
  )
  const stats = mergeStats(
    local['dashboard.stats'] as StatsWrap,
    cloud['dashboard.stats'] as StatsWrap,
  )
  if (stats) out['dashboard.stats'] = stats
  delete out[CLIENT_TAG]
  return out
}

// Có dữ liệu khách "thật" (không chỉ cài đặt mặc định)?
export function hasMeaningfulData(s: Snapshot): boolean {
  const liveCount = (k: string) =>
    ((s[k] as Syncable[] | undefined) ?? []).filter((i) => i && !i.deletedAt)
      .length
  return Boolean(
    liveCount('dashboard.todos') ||
      liveCount('dashboard.bookmarks') ||
      liveCount('dashboard.habits') ||
      liveCount('dashboard.ytPlaylist') ||
      ((s['dashboard.notes'] as string) ?? '').trim() ||
      Object.keys(
        (s['dashboard.stats'] as StatsWrap)?.state?.pomodoros ?? {},
      ).length,
  )
}

// ---- Push / Realtime ----
async function upsert(userId: string, snap: Snapshot) {
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    data: { ...snap, [CLIENT_TAG]: CLIENT_ID },
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

/** Ghi snapshot rỗng lên cloud (dùng cho "xóa toàn bộ dữ liệu"). */
export async function clearCloudState(userId: string) {
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    data: { [CLIENT_TAG]: CLIENT_ID },
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

async function pushNow() {
  if (!activeUser || applying) return
  const snap = readSnapshot()
  const h = canonical(snap)
  if (h === lastPushed) return
  const status = useSyncStore.getState()
  status.set('syncing')
  try {
    await upsert(activeUser, snap)
    lastPushed = h
    status.markSynced()
  } catch {
    // Giữ `lastPushed` nguyên để lần sau thử lại chính thay đổi này.
    status.set('error')
  }
}

function subscribeRealtime(userId: string) {
  channel = supabase
    .channel(`dashboard_state:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const data = (payload.new as { data?: Snapshot } | null)?.data
        if (!data) return
        if (data[CLIENT_TAG] === CLIENT_ID) return // echo của chính tab này
        applySnapshot(data)
        lastPushed = canonical(readSnapshot())
        useSyncStore.getState().markSynced()
      },
    )
    .subscribe()
}

const flush = () => {
  void pushNow()
}

// Tab ẩn -> đẩy một lần rồi ngủ; không cần polling khi người dùng không ở đây.
const onVisibility = () => {
  flush()
  if (document.visibilityState === 'hidden') {
    if (pushTimer) window.clearInterval(pushTimer)
    pushTimer = null
  } else if (!pushTimer && activeUser) {
    pushTimer = window.setInterval(flush, 2000)
  }
}

export async function startSync(
  userId: string,
  resolveConflict: () => Promise<MergeChoice>,
) {
  if (activeUser === userId) return
  stopSync()
  const gen = ++generation
  activeUser = userId
  const status = useSyncStore.getState()
  status.set('syncing')

  const alive = () => gen === generation && activeUser === userId

  try {
    const { data: row, error } = await supabase
      .from(TABLE)
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!alive()) return

    const local = readSnapshot()
    const cloud = (row?.data as Snapshot | undefined) ?? null
    // Máy này đã từng liên kết đúng tài khoản này chưa?
    const alreadyLinked = localStorage.getItem(LINK_KEY) === userId
    const cloudHasData = cloud
      ? Object.keys(cloud).some((k) => k.startsWith(PREFIX))
      : false

    const commit = async (snap: Snapshot, push: boolean) => {
      if (push) await upsert(userId, snap)
      if (!alive()) return
      lastPushed = canonical(snap)
    }

    if (!cloud || !cloudHasData) {
      await commit(local, true)
    } else if (alreadyLinked) {
      // Đã liên kết -> gộp im lặng (không hỏi), giữ cả thay đổi offline lẫn cloud.
      const m = mergeSnapshots(local, cloud)
      applySnapshot(m)
      await commit(m, true)
    } else if (hasMeaningfulData(local)) {
      // Lần đầu liên kết & cả hai phía có dữ liệu -> hỏi người dùng.
      const choice = await resolveConflict()
      if (!alive()) return
      if (choice === 'merge') {
        const m = mergeSnapshots(local, cloud)
        applySnapshot(m)
        await commit(m, true)
      } else if (choice === 'cloud') {
        applySnapshot(cloud)
        await commit(readSnapshot(), false)
      } else {
        await commit(local, true)
      }
    } else {
      applySnapshot(cloud)
      await commit(readSnapshot(), false)
    }

    if (!alive()) return
    // Ghi nhớ máy đã liên kết tài khoản -> các lần sau không hỏi lại.
    localStorage.setItem(LINK_KEY, userId)
    useSyncStore.getState().markSynced()

    subscribeRealtime(userId)
    pushTimer = window.setInterval(flush, 2000)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', flush)
  } catch {
    if (!alive()) return
    // Phải nhả `activeUser`: nếu giữ nguyên thì mọi lần gọi startSync sau đó bị
    // chặn bởi `if (activeUser === userId) return`, tức là lỗi mạng một lần là
    // hết đồng bộ cho tới khi tải lại trang.
    stopSync()
    useSyncStore.getState().set('error')
  }
}

export function stopSync() {
  generation++
  activeUser = null
  lastPushed = ''
  if (pushTimer) clearInterval(pushTimer)
  pushTimer = null
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('beforeunload', flush)
  useSyncStore.getState().set('idle')
}

/**
 * Đẩy lần cuối rồi dọn dữ liệu của tài khoản khỏi máy.
 *
 * Bắt buộc phải dọn: nếu để lại, người tiếp theo đăng nhập trên cùng máy sẽ bị
 * coi là "có dữ liệu khách" và có thể gộp dữ liệu của người trước vào tài khoản
 * của mình.
 */
export async function handoffOnSignOut() {
  await pushNow()
  stopSync()
  clearLocalDashboard()
}
