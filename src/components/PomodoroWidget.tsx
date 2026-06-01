import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { quoteOfTheDay } from '../lib/quotes'
import { useStatsStore } from '../store/useStatsStore'
import { GlassCard } from './GlassCard'

type Mode = 'work' | 'break'

interface Durations {
  work: number // phút
  break: number // phút
}

const pad = (n: number) => n.toString().padStart(2, '0')
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n))

// Phát một tiếng beep ngắn khi hết phiên (Web Audio, không cần file âm thanh).
function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    /* ignore */
  }
}

export function PomodoroWidget() {
  const { t, lang } = useI18n()
  const [durations, setDurations] = useLocalStorage<Durations>(
    'dashboard.pomodoro',
    { work: 25, break: 5 },
  )
  const [mode, setMode] = useState<Mode>('work')
  const [secondsLeft, setSecondsLeft] = useState(durations.work * 60)
  const [running, setRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const logPomodoro = useStatsStore((s) => s.logPomodoro)
  const quote = quoteOfTheDay(lang)

  const secondsFor = useCallback(
    (m: Mode) => durations[m] * 60,
    [durations],
  )

  const switchMode = useCallback(
    (next: Mode) => {
      setMode(next)
      setSecondsLeft(durations[next] * 60)
      setRunning(false)
    },
    [durations],
  )

  // Khi đổi cài đặt lúc đang dừng -> cập nhật lại thời gian còn lại theo mode.
  useEffect(() => {
    if (!running) setSecondsLeft(durations[mode] * 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durations])

  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          beep()
          if (mode === 'work') logPomodoro() // ghi nhận 1 phiên tập trung
          const next: Mode = mode === 'work' ? 'break' : 'work'
          setMode(next)
          setRunning(false)
          return durations[next] * 60
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, mode, durations])

  const total = secondsFor(mode)
  const progress = total > 0 ? 1 - secondsLeft / total : 0
  const R = 52
  const C = 2 * Math.PI * R
  const accent = mode === 'work' ? '#34d399' : '#38bdf8'

  const updateDuration = (key: keyof Durations, value: number) =>
    setDurations((d) => ({ ...d, [key]: clamp(Math.round(value) || 1, 1, 90) }))

  return (
    <GlassCard glow="hover:shadow-emerald-500/20" className="flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-200/70">
          {t('pomodoro.title')}
        </h2>
        <div className="flex items-center gap-1">
          <div className="flex gap-1 rounded-full bg-black/5 p-0.5 text-xs dark:bg-white/5">
            {(['work', 'break'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={
                  'rounded-full px-3 py-1 font-medium transition ' +
                  (mode === m
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white')
                }
              >
                {m === 'work' ? t('pomodoro.work') : t('pomodoro.break')}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-black/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t('pomodoro.settings')}
          >
            ⚙️
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-black/10 bg-black/5 p-3 text-sm dark:border-white/10 dark:bg-white/5">
          <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
            {t('pomodoro.workMin')}
            <input
              type="number"
              min={1}
              max={90}
              value={durations.work}
              onChange={(e) => updateDuration('work', +e.target.value)}
              className="rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-slate-900 outline-none focus:border-emerald-400/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
            {t('pomodoro.breakMin')}
            <input
              type="number"
              min={1}
              max={90}
              value={durations.break}
              onChange={(e) => updateDuration('break', +e.target.value)}
              className="rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-slate-900 outline-none focus:border-emerald-400/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </label>
        </div>
      )}

      <div className="relative mx-auto mt-4 h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            className="stroke-black/10 dark:stroke-white/10"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
          {pad(Math.floor(secondsLeft / 60))}:{pad(secondsLeft % 60)}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className="rounded-lg bg-emerald-500/90 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          {running ? t('pomodoro.pause') : t('pomodoro.start')}
        </button>
        <button
          onClick={() => switchMode(mode)}
          className="rounded-lg border border-black/10 bg-black/5 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          {t('pomodoro.reset')}
        </button>
      </div>

      <blockquote className="mt-5 border-t border-black/10 pt-4 text-center dark:border-white/10">
        <p className="text-sm italic text-slate-600 dark:text-slate-300">
          “{quote.text}”
        </p>
        <footer className="mt-1 text-xs text-slate-500">
          — {quote.author}
        </footer>
      </blockquote>
    </GlassCard>
  )
}
