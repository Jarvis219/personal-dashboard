import type { RealtimeChannel } from '@supabase/supabase-js'
import { useLangStore } from '../i18n/useI18n'
import { useCustomThemeStore } from '../store/useCustomThemeStore'
import { useStatsStore } from '../store/useStatsStore'
import { useUserStore } from '../store/useUserStore'
import { useWidgetsStore } from '../store/useWidgetsStore'
import { useThemeStore } from '../theme/useThemeStore'
import { supabase } from './supabase'

export type Snapshot = Record<string, unknown>
export type MergeChoice = 'merge' | 'cloud' | 'guest'

const PREFIX = 'dashboard.'
const WEATHER_PREFIX = 'dashboard.weather.'
const TABLE = 'dashboard_state'
// Đánh dấu máy đã liên kết tài khoản nào (KHÔNG có prefix dashboard. -> không bị sync).
const LINK_KEY = 'pd.syncAccount'

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
let lastHash = ''
let pushTimer: number | null = null
let channel: RealtimeChannel | null = null
let activeUser: string | null = null

const hash = (o: unknown) => JSON.stringify(o)

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

// ---- Merge guest + cloud ----
interface WithId {
  id: string
}
function unionById<T extends WithId>(a?: T[], b?: T[]): T[] {
  const map = new Map<string, T>()
  ;[...(b ?? []), ...(a ?? [])].forEach((x) => map.set(x.id, { ...map.get(x.id), ...x }))
  return [...map.values()]
}

interface Habit {
  id: string
  name: string
  done: Record<string, boolean>
}
function mergeHabits(a?: Habit[], b?: Habit[]): Habit[] {
  const map = new Map<string, Habit>()
  for (const h of [...(b ?? []), ...(a ?? [])]) {
    const cur = map.get(h.id)
    map.set(h.id, {
      id: h.id,
      name: h.name || cur?.name || '',
      done: { ...(cur?.done ?? {}), ...h.done },
    })
  }
  return [...map.values()]
}

type StatsWrap = { state?: { pomodoros?: Record<string, number> }; version?: number }
function mergeStats(a?: StatsWrap, b?: StatsWrap): StatsWrap | undefined {
  if (!a && !b) return undefined
  const pa = a?.state?.pomodoros ?? {}
  const pb = b?.state?.pomodoros ?? {}
  const merged: Record<string, number> = { ...pb }
  for (const [k, v] of Object.entries(pa)) merged[k] = Math.max(merged[k] ?? 0, v)
  return { state: { pomodoros: merged }, version: a?.version ?? b?.version ?? 0 }
}

function mergeNotes(a?: string, b?: string): string {
  const x = (a ?? '').trim()
  const y = (b ?? '').trim()
  if (x && y && x !== y) return `${x}\n\n---\n\n${y}`
  return x || y || ''
}

// local = guest (máy), cloud = tài khoản. Mặc định cài đặt ưu tiên cloud,
// nhưng dữ liệu dạng danh sách thì hợp nhất.
export function mergeSnapshots(local: Snapshot, cloud: Snapshot): Snapshot {
  const out: Snapshot = { ...local, ...cloud }
  out['dashboard.todos'] = unionById(
    local['dashboard.todos'] as WithId[],
    cloud['dashboard.todos'] as WithId[],
  )
  out['dashboard.bookmarks'] = unionById(
    local['dashboard.bookmarks'] as WithId[],
    cloud['dashboard.bookmarks'] as WithId[],
  )
  out['dashboard.ytPlaylist'] = unionById(
    local['dashboard.ytPlaylist'] as WithId[],
    cloud['dashboard.ytPlaylist'] as WithId[],
  )
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
  return out
}

// Có dữ liệu khách "thật" (không chỉ cài đặt mặc định)?
export function hasMeaningfulData(s: Snapshot): boolean {
  const arr = (k: string) => (s[k] as unknown[] | undefined)?.length
  return Boolean(
    arr('dashboard.todos') ||
      arr('dashboard.bookmarks') ||
      arr('dashboard.habits') ||
      arr('dashboard.ytPlaylist') ||
      ((s['dashboard.notes'] as string) ?? '').trim() ||
      Object.keys(
        (s['dashboard.stats'] as StatsWrap)?.state?.pomodoros ?? {},
      ).length,
  )
}

// ---- Push / Realtime ----
async function upsert(userId: string, snap: Snapshot) {
  await supabase.from(TABLE).upsert({
    user_id: userId,
    data: snap,
    updated_at: new Date().toISOString(),
  })
}

async function pushNow() {
  if (!activeUser || applying) return
  const snap = readSnapshot()
  const h = hash(snap)
  if (h === lastHash) return
  lastHash = h
  await upsert(activeUser, snap)
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
        const h = hash(data)
        if (h === lastHash) return // bỏ echo từ chính mình
        lastHash = h
        applySnapshot(data)
      },
    )
    .subscribe()
}

const flush = () => {
  void pushNow()
}

export async function startSync(
  userId: string,
  resolveConflict: () => Promise<MergeChoice>,
) {
  if (activeUser === userId) return
  activeUser = userId

  const { data: row } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()

  const local = readSnapshot()
  const cloud = (row?.data as Snapshot | undefined) ?? null
  // Máy này đã từng liên kết đúng tài khoản này chưa?
  const alreadyLinked = localStorage.getItem(LINK_KEY) === userId

  if (!cloud) {
    await upsert(userId, local)
    lastHash = hash(local)
  } else if (alreadyLinked) {
    // Đã liên kết -> gộp im lặng (không hỏi), giữ cả thay đổi offline lẫn cloud.
    const m = mergeSnapshots(local, cloud)
    applySnapshot(m)
    await upsert(userId, m)
    lastHash = hash(m)
  } else if (hasMeaningfulData(local) && Object.keys(cloud).length > 0) {
    // Lần đầu liên kết & cả hai phía có dữ liệu -> hỏi người dùng.
    const choice = await resolveConflict()
    if (choice === 'merge') {
      const m = mergeSnapshots(local, cloud)
      applySnapshot(m)
      await upsert(userId, m)
      lastHash = hash(m)
    } else if (choice === 'cloud') {
      applySnapshot(cloud)
      lastHash = hash(cloud)
    } else {
      await upsert(userId, local)
      lastHash = hash(local)
    }
  } else if (Object.keys(cloud).length > 0) {
    applySnapshot(cloud)
    lastHash = hash(cloud)
  } else {
    await upsert(userId, local)
    lastHash = hash(local)
  }

  // Ghi nhớ máy đã liên kết tài khoản -> các lần sau không hỏi lại.
  localStorage.setItem(LINK_KEY, userId)

  subscribeRealtime(userId)
  pushTimer = window.setInterval(flush, 2000)
  window.addEventListener('visibilitychange', flush)
  window.addEventListener('beforeunload', flush)
}

export function stopSync() {
  activeUser = null
  lastHash = ''
  if (pushTimer) clearInterval(pushTimer)
  pushTimer = null
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
  window.removeEventListener('visibilitychange', flush)
  window.removeEventListener('beforeunload', flush)
}
