import { useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { solarToLunar } from '../lib/lunar'
import { GlassCard } from './GlassCard'

// Số ô trống đầu tháng (tuần bắt đầu từ Thứ Hai).
function leadingBlanks(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay() // 0=CN
  return (jsDay + 6) % 7
}

// Tên viết tắt các thứ (Mon→Sun) theo locale.
function weekdayLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-01 là Thứ Hai -> lấy 7 ngày liên tiếp.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(2024, 0, 1 + i)),
  )
}

export function CalendarWidget() {
  const { t, locale } = useI18n()
  const today = new Date()
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const blanks = leadingBlanks(view.year, view.month)
  const cells: (number | null)[] = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const isToday = (d: number) =>
    d === today.getDate() &&
    view.month === today.getMonth() &&
    view.year === today.getFullYear()

  const shift = (delta: number) =>
    setView((v) => {
      const m = v.month + delta
      return {
        year: v.year + Math.floor(m / 12),
        month: ((m % 12) + 12) % 12,
      }
    })

  const goToday = () =>
    setView({ year: today.getFullYear(), month: today.getMonth() })

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(view.year, view.month))

  return (
    <GlassCard glow="hover:shadow-rose-500/20" className="flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-200/70">
          {t('calendar.title')}
        </h2>
        <button
          onClick={goToday}
          className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-700 transition hover:bg-rose-500/25 dark:text-rose-200"
        >
          {t('calendar.today')}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          className="rounded-lg px-2 py-1 text-slate-500 transition hover:bg-black/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label={t('calendar.prev')}
        >
          ‹
        </button>
        <span className="text-base font-semibold capitalize text-slate-900 dark:text-white">
          {monthLabel}
        </span>
        <button
          onClick={() => shift(1)}
          className="rounded-lg px-2 py-1 text-slate-500 transition hover:bg-black/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label={t('calendar.next')}
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
        {weekdayLabels(locale).map((w, i) => (
          <div
            key={i}
            className="py-1 font-medium capitalize text-slate-400 dark:text-slate-500"
          >
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />
          const lunar = solarToLunar(d, view.month + 1, view.year)
          // Mùng 1 âm lịch hiện "ngày/tháng" để dễ nhận ra đầu tháng âm.
          const lunarLabel =
            lunar.day === 1 ? `${lunar.day}/${lunar.month}` : `${lunar.day}`
          const today = isToday(d)
          return (
            <div
              key={i}
              className={
                'flex aspect-square flex-col items-center justify-center rounded-lg ' +
                (today
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                  : 'text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10')
              }
            >
              <span className="text-sm font-medium leading-none">{d}</span>
              <span
                className={
                  'mt-0.5 text-[9px] leading-none ' +
                  (today
                    ? 'text-rose-100'
                    : lunar.day === 1
                      ? 'font-medium text-rose-500 dark:text-rose-300'
                      : 'text-slate-400 dark:text-slate-500')
                }
              >
                {lunarLabel}
              </span>
            </div>
          )
        })}
      </div>

      {/* Âm lịch hôm nay */}
      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        {t('calendar.lunarToday')}{' '}
        <span className="font-medium text-rose-600 dark:text-rose-300">
          {(() => {
            const l = solarToLunar(
              today.getDate(),
              today.getMonth() + 1,
              today.getFullYear(),
            )
            return `${l.day}/${l.month}${l.leap ? ' ' + t('calendar.leap') : ''}`
          })()}
        </span>
      </p>
    </GlassCard>
  )
}
