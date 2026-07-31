import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const pad = (n: number) => n.toString().padStart(2, '0')
export const statsDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

interface StatsState {
  pomodoros: Record<string, number> // dateKey -> số phiên làm việc hoàn thành
  focusMinutes: Record<string, number> // dateKey -> tổng phút tập trung
  todosDone: Record<string, number> // dateKey -> số việc đánh dấu xong
  logPomodoro: (minutes: number) => void
  logTodoDone: (delta: number) => void
}

const bump = (
  map: Record<string, number>,
  key: string,
  delta: number,
): Record<string, number> => ({
  ...map,
  [key]: Math.max(0, (map[key] ?? 0) + delta),
})

// Thống kê theo ngày — lưu localStorage (dashboard.* để reset/sync cuốn theo).
export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      pomodoros: {},
      focusMinutes: {},
      todosDone: {},
      logPomodoro: (minutes) =>
        set((s) => {
          const k = statsDateKey(new Date())
          return {
            pomodoros: bump(s.pomodoros, k, 1),
            focusMinutes: bump(s.focusMinutes, k, Math.max(0, minutes)),
          }
        }),
      logTodoDone: (delta) =>
        set((s) => ({
          todosDone: bump(s.todosDone, statsDateKey(new Date()), delta),
        })),
    }),
    {
      name: 'dashboard.stats',
      version: 1,
      // Bản 0 chỉ có `pomodoros`; hai map mới bắt đầu từ rỗng.
      migrate: (state) => ({
        focusMinutes: {},
        todosDone: {},
        ...(state as object),
      }) as StatsState,
    },
  ),
)
