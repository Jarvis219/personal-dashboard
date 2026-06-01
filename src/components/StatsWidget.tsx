import { useI18n } from '../i18n/useI18n'
import { statsDateKey, useStatsStore } from '../store/useStatsStore'
import { GlassCard } from './GlassCard'

export function StatsWidget() {
  const { t, locale } = useI18n()
  const pomodoros = useStatsStore((s) => s.pomodoros)

  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 6 + i)
    return { date: d, count: pomodoros[statsDateKey(d)] ?? 0 }
  })
  const todayCount = days[6].count
  const weekTotal = days.reduce((a, d) => a + d.count, 0)
  const max = Math.max(1, ...days.map((d) => d.count))
  const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })

  return (
    <GlassCard glow="hover:shadow-teal-500/20" className="flex flex-col">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-200/70">
        {t('stats.title')}
      </h2>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white">
            {todayCount}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            🍅 {t('stats.today')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-slate-700 dark:text-slate-200">
            {weekTotal}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t('stats.week')}
          </div>
        </div>
      </div>

      {/* Biểu đồ cột 7 ngày */}
      <div className="mt-4 flex flex-1 items-end justify-between gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-20 w-full items-end">
              <div
                className="w-full rounded-t bg-teal-500/80 transition-all"
                style={{ height: `${(d.count / max) * 100}%` }}
                title={`${d.count}`}
              />
            </div>
            <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500">
              {narrow.format(d.date)}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
