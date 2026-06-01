import { periodForHour, useClock } from '../hooks/useClock'
import { useI18n } from '../i18n/useI18n'
import { useUserStore } from '../store/useUserStore'
import { GlassCard } from './GlassCard'

const pad = (n: number) => n.toString().padStart(2, '0')

// Câu chào phụ theo ngày trong tuần.
function dayTag(day: number): 'weekend' | 'monday' | 'friday' | 'midweek' {
  if (day === 0 || day === 6) return 'weekend'
  if (day === 1) return 'monday'
  if (day === 5) return 'friday'
  return 'midweek'
}

export function ClockWidget() {
  const now = useClock()
  const { t, locale } = useI18n()
  const name = useUserStore((s) => s.name)
  const greeting = t(`greeting.${periodForHour(now.getHours())}`)
  const tagline = t(`greeting.tag.${dayTag(now.getDay())}`)
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)

  return (
    <GlassCard
      glow="hover:shadow-cyan-500/20"
      className="flex flex-col items-center justify-center text-center"
    >
      <p className="text-sm font-medium tracking-wide text-cyan-700 dark:text-cyan-200/80">
        {greeting}
        {name ? `, ${name}` : ''} 👋
      </p>
      <div className="mt-2 font-mono text-6xl font-bold tabular-nums text-slate-900 sm:text-7xl dark:text-white">
        {pad(now.getHours())}
        <span className="animate-pulse text-cyan-500 dark:text-cyan-400">:</span>
        {pad(now.getMinutes())}
        <span className="ml-1 align-top text-2xl text-cyan-600/70 dark:text-cyan-300/70">
          {pad(now.getSeconds())}
        </span>
      </div>
      <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
        {dateLabel}
      </p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        {tagline}
      </p>
    </GlassCard>
  )
}
