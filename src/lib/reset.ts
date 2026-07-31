// Tiện ích quản lý dữ liệu dashboard trong localStorage.

import { useAuthStore } from '../auth/useAuthStore'
import { LINK_KEY, clearCloudState, stopSync } from './sync'

const PREFIX = 'dashboard.'
// Cache thời tiết không phải dữ liệu người dùng -> không đưa vào file sao lưu.
const WEATHER_PREFIX = 'dashboard.weather.'

const BACKUP_VERSION = 1

interface Backup {
  __app: 'personal-dashboard'
  __version: number
  __exportedAt: string
  data: Record<string, unknown>
}

const dashboardKeys = () =>
  Object.keys(localStorage).filter((key) => key.startsWith(PREFIX))

/**
 * Xóa toàn bộ dữ liệu dashboard rồi tải lại trang.
 *
 * Chỉ xóa localStorage là KHÔNG đủ khi đang đăng nhập: cờ liên kết `pd.syncAccount`
 * và dữ liệu trên cloud sẽ khiến mọi thứ quay lại ngay sau khi reload. Nên khi có
 * tài khoản ta buộc phải chọn một trong hai: xóa luôn dữ liệu cloud, hoặc đăng xuất
 * để về chế độ khách. Không có lựa chọn thứ ba nào trung thực.
 */
export async function resetDashboard({ clearCloud = true } = {}) {
  const userId = useAuthStore.getState().user?.id ?? null

  stopSync() // dừng vòng đẩy trước khi xóa, tránh đẩy snapshot rỗng ngoài ý muốn

  dashboardKeys().forEach((key) => localStorage.removeItem(key))
  localStorage.removeItem(LINK_KEY)

  if (userId) {
    try {
      if (clearCloud) await clearCloudState(userId)
      else await useAuthStore.getState().signOut()
    } catch {
      // Mạng lỗi: vẫn reload để dữ liệu local đã xóa có hiệu lực, nhưng nếu
      // không xóa được cloud thì đăng xuất để tránh bị kéo dữ liệu về.
      try {
        await useAuthStore.getState().signOut()
      } catch {
        /* ignore */
      }
    }
  }

  location.reload()
}

/** Xuất tất cả key dashboard.* (trừ cache thời tiết) ra file JSON tải về. */
export function exportDashboard(): number {
  const data: Record<string, unknown> = {}
  dashboardKeys()
    .filter((key) => !key.startsWith(WEATHER_PREFIX))
    .forEach((key) => {
      const raw = localStorage.getItem(key)
      if (raw === null) return
      try {
        data[key] = JSON.parse(raw)
      } catch {
        data[key] = raw
      }
    })

  const backup: Backup = {
    __app: 'personal-dashboard',
    __version: BACKUP_VERSION,
    __exportedAt: new Date().toISOString(),
    data,
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  return Object.keys(data).length
}

/**
 * Đọc & kiểm tra file sao lưu mà CHƯA ghi gì. Trả về các entry hợp lệ để UI
 * hỏi xác nhận trước khi ghi đè. Chấp nhận cả file phẳng của bản cũ.
 */
export async function readBackup(
  file: File,
): Promise<Record<string, unknown>> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('invalid-json')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('invalid-shape')

  const obj = parsed as Record<string, unknown>
  const raw =
    obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj

  const entries: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith(PREFIX)) entries[key] = value
  }
  if (!Object.keys(entries).length) throw new Error('no-entries')
  return entries
}

/**
 * Ghi dữ liệu sao lưu vào localStorage rồi tải lại.
 *
 * Luôn `JSON.stringify` — kể cả khi giá trị đã là string. Bản cũ ghi string thô,
 * nhưng `useLocalStorage` luôn `JSON.parse` khi đọc, nên các key kiểu string
 * (`dashboard.notes`, `weatherCity`, `lofiMode`, `lofiLoop`) parse lỗi, rơi về
 * mặc định rồi bị effect ghi đè -> mất dữ liệu vĩnh viễn.
 */
export function applyBackup(entries: Record<string, unknown>) {
  Object.entries(entries).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value))
  })
  location.reload()
}
