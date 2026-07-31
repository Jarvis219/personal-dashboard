import { useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { statsDateKey, useStatsStore } from '../store/useStatsStore'
import { GlassCard } from './GlassCard'

type Metric = 'pomodoros' | 'todosDone' | 'focusMinutes'

// Ba chỉ số cùng nằm trên một trục thời gian nhưng khác thang đo hoàn toàn
// (phiên vs việc vs phút). Không vẽ chồng và tuyệt đối không dùng 2 trục y —
// các ô số liệu ở trên CHÍNH LÀ bộ chọn, biểu đồ luôn chỉ hiển thị một chuỗi.
const METRICS: {
  id: Metric
  /** Nhãn ngắn cho ô số liệu (chỗ hẹp), và nhãn đầy đủ cho tooltip/aria. */
  shortKey: string
  labelKey: string
  varName: string
}[] = [
  {
    id: 'pomodoros',
    shortKey: 'stats.mSessions',
    labelKey: 'stats.today',
    varName: '--viz-1',
  },
  {
    id: 'todosDone',
    shortKey: 'stats.mTasks',
    labelKey: 'stats.todosDone',
    varName: '--viz-2',
  },
  {
    id: 'focusMinutes',
    shortKey: 'stats.mMinutes',
    labelKey: 'stats.focusMin',
    varName: '--viz-3',
  },
]

export function StatsWidget() {
  const { t, locale } = useI18n()
  const pomodoros = useStatsStore((s) => s.pomodoros)
  const todosDone = useStatsStore((s) => s.todosDone)
  const focusMinutes = useStatsStore((s) => s.focusMinutes)
  const [metric, setMetric] = useState<Metric>('pomodoros')
  const [hovered, setHovered] = useState<number | null>(null)

  const source: Record<Metric, Record<string, number>> = {
    pomodoros,
    todosDone,
    focusMinutes,
  }

  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 6 + i)
    return { date: d, key: statsDateKey(d) }
  })

  const series = days.map((d) => source[metric][d.key] ?? 0)
  const max = Math.max(...series)
  const weekTotal = series.reduce((a, b) => a + b, 0)
  const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  const full = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  const active = METRICS.find((m) => m.id === metric)!
  const hasAnyData = Object.values(source).some((map) =>
    Object.values(map).some((v) => v > 0),
  )

  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="card-title">{t('stats.title')}</h2>
        <span className="badge tabular-nums">
          {weekTotal} · {t('stats.week')}
        </span>
      </div>

      {/* Hàng chỉ số kiêm bộ chọn chuỗi. Mỗi ô có nhãn chữ riêng nên danh tính
          không bao giờ chỉ dựa vào màu. */}
      <div className="mt-3 grid grid-cols-3 gap-2" role="group">
        {METRICS.map((m) => {
          const value = source[m.id][statsDateKey(today)] ?? 0
          const selected = m.id === metric
          return (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              aria-pressed={selected}
              aria-label={`${t(m.labelKey)}: ${value}`}
              title={t(m.labelKey)}
              className={
                'rounded-xl border px-2.5 py-2 text-left transition ' +
                (selected
                  ? 'border-black/10 bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.08]'
                  : 'border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.05]')
              }
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: `var(${m.varName})` }}
                  aria-hidden="true"
                />
                <span className="truncate text-[11px] text-slate-600 dark:text-slate-400">
                  {t(m.shortKey)}
                </span>
              </span>
              <span className="mt-0.5 block text-2xl font-bold text-slate-900 dark:text-white">
                {value}
              </span>
            </button>
          )
        })}
      </div>

      {!hasAnyData ? (
        <div className="empty-state">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="h-7 w-7 text-slate-400 opacity-40 dark:text-slate-500"
            aria-hidden="true"
          >
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          </svg>
          <p className="text-sm muted">{t('stats.empty')}</p>
        </div>
      ) : (
        <>
          <div className="relative mt-4 flex flex-1 items-end gap-[2px]">
            {series.map((value, i) => {
              const pct = max > 0 ? (value / max) * 100 : 0
              const isHovered = hovered === i
              return (
                <div
                  key={days[i].key}
                  className="relative flex flex-1 flex-col items-center gap-1"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  aria-label={`${full.format(days[i].date)}: ${value} ${t(active.labelKey)}`}
                >
                  {isHovered && (
                    <span className="pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium tabular-nums text-white shadow-lg dark:bg-slate-700">
                      {value}
                    </span>
                  )}
                  {/* Track mờ giữ hình dáng biểu đồ cả khi giá trị = 0 (trước đây
                      cột 0% cao là vô hình nên card trông như lỗi render). */}
                  <div
                    className="flex h-20 w-full items-end rounded-t border-b"
                    style={{
                      background: 'var(--viz-track)',
                      borderColor: 'var(--viz-baseline)',
                    }}
                  >
                    <div
                      className="w-full rounded-t motion-safe:transition-[height] motion-safe:duration-300"
                      style={{
                        height: `${pct}%`,
                        minHeight: value > 0 ? 3 : 0,
                        background: `var(${active.varName})`,
                        opacity: isHovered ? 1 : 0.9,
                      }}
                    />
                  </div>
                  <span className="text-[11px] uppercase tabular-nums text-slate-600 dark:text-slate-400">
                    {narrow.format(days[i].date)}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
            {t('stats.source')}
          </p>
        </>
      )}
    </GlassCard>
  )
}
