import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import {
  notificationPermission,
  requestNotificationPermission,
} from '../lib/notify'
import { quoteOfTheDay } from '../lib/quotes'
import {
  type PomodoroMode,
  remainingSeconds,
  usePomodoroStore,
} from '../store/usePomodoroStore'
import { toast } from '../store/useToastStore'
import { GlassCard } from './GlassCard'
import {
  BellIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  SettingsIcon,
  SkipSessionIcon,
} from './icons'

const pad = (n: number) => n.toString().padStart(2, '0')

const TABS: PomodoroMode[] = ['work', 'break']

/** Tick chỉ để vẽ lại — số giây thật luôn tính từ `endsAt`. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [active])
  return active ? now : Date.now()
}

export function PomodoroWidget() {
  const { t, lang } = useI18n()
  const store = usePomodoroStore()
  const {
    durations,
    mode,
    endsAt,
    completed,
    autoStart,
    toggle,
    reset,
    skip,
    setMode,
    setDurations,
    setAutoStart,
  } = store
  const [showSettings, setShowSettings] = useState(false)
  const [permission, setPermission] = useState(notificationPermission)
  const quote = quoteOfTheDay(lang)

  const running = endsAt !== null
  const now = useNow(running)
  const secondsLeft = remainingSeconds(store, now)

  const total = durations[mode] * 60
  const progress = total > 0 ? 1 - secondsLeft / total : 0
  const R = 52
  const C = 2 * Math.PI * R
  const accent = mode === 'work' ? '#34d399' : '#38bdf8'
  const atFullRest = !running && secondsLeft === total

  const askNotify = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'denied') toast(t('pomodoro.notifyBlocked'), 'error')
  }

  const cycleLabel = t('pomodoro.cycle', {
    n: (completed % durations.cycleLen) + 1,
    total: durations.cycleLen,
  })
  const modeLabel =
    mode === 'work'
      ? t('pomodoro.work')
      : mode === 'longBreak'
        ? t('pomodoro.longBreak')
        : t('pomodoro.break')

  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="card-title">{t('pomodoro.title')}</h2>
        <div className="flex items-center gap-1">
          <div className="flex gap-1 rounded-full bg-black/5 p-0.5 text-xs dark:bg-white/5">
            {TABS.map((m) => {
              const selected = m === 'work' ? mode === 'work' : mode !== 'work'
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={selected}
                  className={
                    'rounded-full px-3 py-1 font-medium transition ' +
                    (selected
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
                  }
                >
                  {m === 'work' ? t('pomodoro.work') : t('pomodoro.break')}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            aria-label={t('pomodoro.settings')}
            aria-expanded={showSettings}
            className="icon-btn"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-3 space-y-3 rounded-xl border border-black/10 bg-black/5 p-3 text-sm dark:border-white/10 dark:bg-white/5">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['work', 'pomodoro.workMin'],
                ['break', 'pomodoro.breakMin'],
                ['longBreak', 'pomodoro.longBreakMin'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300"
              >
                {t(label)}
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={durations[key]}
                  onChange={(e) => setDurations({ [key]: +e.target.value })}
                  className="field"
                />
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
            {t('pomodoro.cycleLen')}
            <input
              type="number"
              min={2}
              max={12}
              value={durations.cycleLen}
              onChange={(e) => setDurations({ cycleLen: +e.target.value })}
              className="field w-24"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            {t('pomodoro.autoStart')}
          </label>
          {permission === 'default' && (
            <button
              onClick={askNotify}
              className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <BellIcon className="h-3.5 w-3.5" />
              {t('pomodoro.enableNotify')}
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-center text-xs text-slate-600 dark:text-slate-400">
        {modeLabel} · {cycleLabel}
      </p>

      <div className="relative mx-auto mt-2 h-36 w-36">
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
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white"
          role="timer"
          aria-live="off"
          aria-label={`${modeLabel} ${Math.floor(secondsLeft / 60)}:${pad(secondsLeft % 60)}`}
        >
          {pad(Math.floor(secondsLeft / 60))}:{pad(secondsLeft % 60)}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={reset}
          disabled={atFullRest}
          aria-label={t('pomodoro.reset')}
          title={t('pomodoro.reset')}
          className="icon-btn disabled:opacity-30"
        >
          <ResetIcon className="h-4 w-4" />
        </button>
        <button
          onClick={toggle}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
          aria-label={running ? t('pomodoro.pause') : t('pomodoro.start')}
        >
          {running ? (
            <PauseIcon className="h-5 w-5" />
          ) : (
            <PlayIcon className="h-5 w-5 translate-x-px" />
          )}
        </button>
        <button
          onClick={skip}
          aria-label={t('pomodoro.skip')}
          title={t('pomodoro.skip')}
          className="icon-btn"
        >
          <SkipSessionIcon className="h-4 w-4" />
        </button>
      </div>

      <blockquote className="divider-t mt-5 pt-4 text-center">
        <p className="text-sm italic text-slate-600 dark:text-slate-300">
          “{quote.text}”
        </p>
        <footer className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          — {quote.author}
        </footer>
      </blockquote>
    </GlassCard>
  )
}
