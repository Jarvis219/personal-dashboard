import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { solarToLunar } from '../lib/lunar'
import { alive } from '../lib/syncable'
import { useUiStore } from '../store/useUiStore'
import type { Todo } from '../types'
import { GlassCard } from './GlassCard'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

const pad = (n: number) => n.toString().padStart(2, '0')
const keyOf = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}`

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
  const { selectedDate, setSelectedDate } = useUiStore()
  const [todos] = useLocalStorage<Todo[]>('dashboard.todos', [])

  // Ngày nào có việc chưa xong -> chấm dưới ô. Đây là mối nối giữa Lịch và Todo:
  // trước đây hai widget này hoàn toàn không biết đến nhau.
  const dueCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of alive(todos)) {
      if (!item.due || item.done) continue
      map.set(item.due, (map.get(item.due) ?? 0) + 1)
    }
    return map
  }, [todos])

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const blanks = leadingBlanks(view.year, view.month)
  const cells: (number | null)[] = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const todayKey = keyOf(today.getFullYear(), today.getMonth(), today.getDate())

  const shift = (delta: number) =>
    setView((v) => {
      const m = v.month + delta
      return {
        year: v.year + Math.floor(m / 12),
        month: ((m % 12) + 12) % 12,
      }
    })

  const goToday = () => {
    setView({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedDate(null)
  }

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(view.year, view.month))
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const lunarToday = solarToLunar(
    today.getDate(),
    today.getMonth() + 1,
    today.getFullYear(),
  )

  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="card-title">{t('calendar.title')}</h2>
        <button onClick={goToday} className="badge hover:brightness-110">
          {t('calendar.today')}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          aria-label={t('calendar.prev')}
          className="icon-btn h-8 w-8"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-base font-semibold capitalize text-slate-900 dark:text-white">
          {monthLabel}
        </span>
        <button
          onClick={() => shift(1)}
          aria-label={t('calendar.next')}
          className="icon-btn h-8 w-8"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
        {weekdayLabels(locale).map((w, i) => (
          <div
            key={i}
            className="py-1 font-medium capitalize text-slate-600 dark:text-slate-400"
          >
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />
          const key = keyOf(view.year, view.month, d)
          const lunar = solarToLunar(d, view.month + 1, view.year)
          // Mùng 1 âm lịch hiện "ngày/tháng" để dễ nhận ra đầu tháng âm.
          const lunarLabel =
            lunar.day === 1
              ? `${lunar.day}/${lunar.month}${lunar.leap ? '+' : ''}`
              : `${lunar.day}`
          const isToday = key === todayKey
          const isSelected = key === selectedDate
          const due = dueCount.get(key) ?? 0
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              aria-pressed={isSelected}
              aria-label={`${fullDate.format(new Date(view.year, view.month, d))}${
                due ? ` — ${t('todo.remaining', { n: due })}` : ''
              }`}
              className={
                'relative flex aspect-square flex-col items-center justify-center rounded-lg transition ' +
                (isSelected
                  ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/40'
                  : isToday
                    ? 'ring-2 ring-indigo-400 text-slate-900 dark:text-white'
                    : 'text-slate-700 hover:bg-black/[0.06] dark:text-slate-200 dark:hover:bg-white/10')
              }
            >
              <span className="text-sm font-medium leading-none tabular-nums">
                {d}
              </span>
              <span
                className={
                  'mt-0.5 text-[11px] leading-none tabular-nums ' +
                  (isSelected
                    ? 'text-indigo-100'
                    : lunar.day === 1
                      ? 'font-medium text-indigo-600 dark:text-indigo-300'
                      : 'text-slate-500 opacity-70 dark:text-slate-400')
                }
              >
                {lunarLabel}
              </span>
              {due > 0 && (
                <span
                  className={
                    'absolute bottom-0.5 h-1 w-1 rounded-full ' +
                    (isSelected ? 'bg-white' : 'bg-rose-500')
                  }
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Âm lịch hôm nay */}
      <p className="mt-3 text-center text-xs text-slate-600 dark:text-slate-400">
        {t('calendar.lunarToday')}{' '}
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {`${lunarToday.day}/${lunarToday.month}${
            lunarToday.leap ? ' ' + t('calendar.leap') : ''
          }`}
        </span>
      </p>
    </GlassCard>
  )
}
