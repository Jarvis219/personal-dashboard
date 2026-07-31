import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useStatsStore } from './useStatsStore'

export type PomodoroMode = 'work' | 'break' | 'longBreak'

export interface Durations {
  work: number // phút
  break: number
  longBreak: number
  cycleLen: number // số phiên làm việc trước một lần nghỉ dài
}

interface PomodoroState {
  durations: Durations
  autoStart: boolean
  mode: PomodoroMode
  /** Mốc kết thúc TUYỆT ĐỐI (ms epoch); null khi không chạy. */
  endsAt: number | null
  /** Giây còn lại khi đang tạm dừng. */
  paused: number
  /** Số phiên làm việc đã xong trong chu kỳ hiện tại. */
  completed: number
  /** Tăng mỗi lần một phiên kết thúc — UI dùng để phát bíp/thông báo. */
  finishedAt: number | null
  finishedMode: PomodoroMode | null

  start: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  skip: () => void
  setMode: (m: PomodoroMode) => void
  setDurations: (patch: Partial<Durations>) => void
  setAutoStart: (v: boolean) => void
  /** Hoàn tất phiên nếu `endsAt` đã qua. Gọi mỗi tick, khi mount và khi quay lại tab. */
  tick: () => void
  clearFinished: () => void
}

const DEFAULTS: Durations = { work: 25, break: 5, longBreak: 15, cycleLen: 4 }
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(n) || lo))

const LEGACY_KEY = 'dashboard.pomodoro'

/** Đọc `{work, break}` của bản cũ (lưu bằng useLocalStorage) rồi bỏ key đó đi. */
function legacyDurations(): Partial<Durations> {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<Durations>
    localStorage.removeItem(LEGACY_KEY)
    const out: Partial<Durations> = {}
    if (typeof parsed.work === 'number') out.work = clamp(parsed.work, 1, 90)
    if (typeof parsed.break === 'number') out.break = clamp(parsed.break, 1, 90)
    return out
  } catch {
    return {}
  }
}

/**
 * Timer dựa trên mốc thời gian tuyệt đối, lưu localStorage.
 *
 * Bản cũ đếm bằng `setInterval(1000)` giảm state trong component: tab chạy nền
 * bị trình duyệt throttle về ~1 tick/phút (và đóng băng sau vài phút), nên 25
 * phút thực có thể mất 40–60 phút; reload là mất luôn trạng thái. Ngoài ra vì
 * state nằm trong component, Focus mode render `<PomodoroWidget />` thứ hai tạo
 * ra một timer thứ hai chạy song song và ghi thống kê gấp đôi.
 */
export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => {
      const secondsFor = (m: PomodoroMode) => get().durations[m] * 60

      const beginNext = (next: PomodoroMode, run: boolean) => {
        const seconds = get().durations[next] * 60
        set({
          mode: next,
          endsAt: run ? Date.now() + seconds * 1000 : null,
          paused: seconds,
        })
      }

      return {
        durations: DEFAULTS,
        autoStart: false,
        mode: 'work',
        endsAt: null,
        paused: DEFAULTS.work * 60,
        completed: 0,
        finishedAt: null,
        finishedMode: null,

        start: () => {
          const { endsAt, paused, mode } = get()
          if (endsAt) return
          const seconds = paused > 0 ? paused : get().durations[mode] * 60
          set({ endsAt: Date.now() + seconds * 1000, paused: seconds })
        },

        pause: () => {
          const { endsAt } = get()
          if (!endsAt) return
          set({
            endsAt: null,
            paused: Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
          })
        },

        toggle: () => (get().endsAt ? get().pause() : get().start()),

        reset: () => set({ endsAt: null, paused: secondsFor(get().mode) }),

        setMode: (mode) =>
          set({ mode, endsAt: null, paused: get().durations[mode] * 60 }),

        /** Bỏ qua phiên hiện tại: sang phiên kế nhưng KHÔNG tính vào thống kê. */
        skip: () => {
          const { mode, completed, durations } = get()
          if (mode === 'work') {
            const done = completed + 1
            const long = done % durations.cycleLen === 0
            set({ completed: done })
            beginNext(long ? 'longBreak' : 'break', false)
          } else {
            beginNext('work', false)
          }
        },

        setDurations: (patch) =>
          set((s) => {
            const durations: Durations = {
              work: clamp(patch.work ?? s.durations.work, 1, 90),
              break: clamp(patch.break ?? s.durations.break, 1, 90),
              longBreak: clamp(patch.longBreak ?? s.durations.longBreak, 1, 90),
              cycleLen: clamp(patch.cycleLen ?? s.durations.cycleLen, 2, 12),
            }
            // Đang dừng -> cập nhật luôn số giây hiển thị theo cài đặt mới.
            return s.endsAt
              ? { durations }
              : { durations, paused: durations[s.mode] * 60 }
          }),

        setAutoStart: (autoStart) => set({ autoStart }),

        tick: () => {
          const { endsAt, mode, completed, durations, autoStart } = get()
          if (!endsAt || endsAt > Date.now()) return

          if (mode === 'work') {
            // Ghi nhận đúng thời lượng phiên vừa xong.
            useStatsStore.getState().logPomodoro(durations.work)
            const done = completed + 1
            const long = done % durations.cycleLen === 0
            set({
              completed: done,
              finishedAt: Date.now(),
              finishedMode: 'work',
            })
            beginNext(long ? 'longBreak' : 'break', autoStart)
          } else {
            set({ finishedAt: Date.now(), finishedMode: mode })
            beginNext('work', autoStart)
          }
        },

        clearFinished: () => set({ finishedAt: null, finishedMode: null }),
      }
    },
    {
      name: 'dashboard.pomodoroTimer',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Lần đầu chạy bản mới: kéo thời lượng người dùng đã đặt ở bản cũ sang.
        const legacy = legacyDurations()
        if (Object.keys(legacy).length) state.setDurations(legacy)
        // Phiên có thể đã kết thúc trong lúc app đóng.
        state.tick()
      },
    },
  ),
)

/** Giây còn lại — dùng chung cho widget và Focus mode. */
export const remainingSeconds = (s: PomodoroState, now: number) =>
  s.endsAt ? Math.max(0, Math.ceil((s.endsAt - now) / 1000)) : s.paused
