import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const pad = (n: number) => n.toString().padStart(2, '0')
export const statsDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

interface StatsState {
  pomodoros: Record<string, number> // dateKey -> số phiên làm việc hoàn thành
  logPomodoro: () => void
}

// Thống kê Pomodoro theo ngày — lưu localStorage (dashboard.* để reset cuốn theo).
export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      pomodoros: {},
      logPomodoro: () =>
        set((s) => {
          const k = statsDateKey(new Date())
          return { pomodoros: { ...s.pomodoros, [k]: (s.pomodoros[k] ?? 0) + 1 } }
        }),
    }),
    { name: 'dashboard.stats' },
  ),
)
