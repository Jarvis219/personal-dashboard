/** Trường chung cho mọi item được đồng bộ theo danh sách.
 *  `updatedAt` để merge chọn bản mới nhất, `deletedAt` là tombstone —
 *  xoá phải để lại dấu, nếu không thiết bị khác sẽ "hồi sinh" item. */
export interface Syncable {
  id: string
  updatedAt?: number
  deletedAt?: number
}

export type Priority = 1 | 2 | 3 // 1 = cao, 2 = thường, 3 = thấp

export interface Todo extends Syncable {
  text: string
  done: boolean
  createdAt: number
  /** 'YYYY-MM-DD' theo giờ địa phương, không có nghĩa là chưa đặt hạn. */
  due?: string
  priority?: Priority
}

export interface Bookmark extends Syncable {
  url: string
  title: string
}

export interface Habit extends Syncable {
  name: string
  done: Record<string, boolean> // key 'YYYY-MM-DD'
  /** Mốc tạo — dùng làm mẫu số heatmap cho đúng lịch sử. */
  createdAt?: number
}

export interface YtTrack extends Syncable {
  /** videoId của YouTube; `id` là khoá riêng nên một video thêm 2 lần vẫn tách được. */
  videoId: string
  title: string | null
}

export interface DailyForecast {
  date: string // ISO 'YYYY-MM-DD'
  code: number
  max: number
  min: number
}

export interface WeatherData {
  temperature: number
  weatherCode: number
  isDay: boolean
  city: string
  humidity: number
  wind: number
  daily: DailyForecast[]
  fetchedAt: number
  /** true khi đã fallback vì người dùng từ chối quyền định vị. */
  geoDenied?: boolean
}
