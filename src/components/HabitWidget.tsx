import { type MouseEvent, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { fireworks } from '../lib/fireworks'
import { GlassCard } from './GlassCard'

interface Habit {
  id: string
  name: string
  done: Record<string, boolean> // key 'YYYY-MM-DD'
}

let counter = 0
const newId = () => `${Date.now()}-${counter++}`
const pad = (n: number) => n.toString().padStart(2, '0')
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Chuỗi ngày liên tiếp tính từ hôm nay trở về trước.
function streakOf(done: Record<string, boolean>): number {
  let s = 0
  const d = new Date()
  while (done[dateKey(d)]) {
    s++
    d.setDate(d.getDate() - 1)
  }
  return s
}

const MILESTONES = [7, 30, 100]

// Ăn mừng lớn khi đạt mốc streak: nhiều đợt pháo hoa.
function celebrate() {
  const w = window.innerWidth
  const h = window.innerHeight
  ;[0.3, 0.5, 0.7].forEach((fx, i) =>
    setTimeout(() => fireworks.burst(w * fx, h * 0.4, 50), i * 180),
  )
}

export function HabitWidget() {
  const { t, locale } = useI18n()
  const [habits, setHabits] = useLocalStorage<Habit[]>('dashboard.habits', [])
  const [input, setInput] = useState('')

  const today = new Date()
  const todayKey = dateKey(today)
  // 7 ngày gần nhất, kết thúc ở hôm nay.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 6 + i)
    return d
  })
  const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })

  const add = () => {
    const name = input.trim()
    if (!name) return
    setHabits((prev) => [...prev, { id: newId(), name, done: {} }])
    setInput('')
  }

  const remove = (id: string) =>
    setHabits((prev) => prev.filter((h) => h.id !== id))

  const toggle = (habitId: string, key: string, e: MouseEvent) => {
    const habit = habits.find((h) => h.id === habitId)
    const wasDone = habit?.done[key]
    if (!wasDone && key === todayKey && habit) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      fireworks.burst(r.left + r.width / 2, r.top + r.height / 2, 28)
      // Đạt mốc streak -> ăn mừng lớn.
      const newStreak = streakOf({ ...habit.done, [key]: true })
      if (MILESTONES.includes(newStreak)) celebrate()
    }
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? { ...h, done: { ...h.done, [key]: !h.done[key] } }
          : h,
      ),
    )
  }

  // Tỉ lệ thói quen hoàn thành trong 1 ngày (cho heatmap).
  const doneFraction = (key: string) => {
    if (!habits.length) return 0
    return habits.filter((h) => h.done[key]).length / habits.length
  }
  const heatDays = Array.from({ length: 70 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 69 + i)
    return dateKey(d)
  })

  return (
    <GlassCard glow="hover:shadow-orange-500/20" className="flex flex-col">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-200/70">
        {t('habit.title')}
      </h2>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t('habit.placeholder')}
          className="min-w-0 flex-1 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-orange-400/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <button
          onClick={add}
          className="rounded-lg bg-orange-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-500"
        >
          {t('habit.add')}
        </button>
      </div>

      {/* Header thứ */}
      {habits.length > 0 && (
        <div className="mt-3 flex items-center gap-2 pl-1 text-[10px] text-slate-400 dark:text-slate-500">
          <span className="flex-1" />
          {days.map((d, i) => (
            <span key={i} className="w-6 text-center uppercase">
              {narrow.format(d)}
            </span>
          ))}
          <span className="w-5" />
        </div>
      )}

      <ul className="scroll-thin mt-1 max-h-48 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {habits.length === 0 && (
          <li className="py-6 text-center text-sm text-slate-500">
            {t('habit.empty')}
          </li>
        )}
        {habits.map((h) => {
          const streak = streakOf(h.done)
          return (
            <li
              key={h.id}
              className="group/h flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                  {h.name}
                </span>
                {streak > 0 && (
                  <span className="flex-none text-xs text-orange-500">
                    🔥{streak}
                  </span>
                )}
              </span>
              {days.map((d, i) => {
                const key = dateKey(d)
                const done = !!h.done[key]
                const isToday = key === todayKey
                return (
                  <button
                    key={i}
                    onClick={(e) => toggle(h.id, key, e)}
                    aria-label={key}
                    className={
                      'h-6 w-6 flex-none rounded-md border text-xs transition ' +
                      (done
                        ? 'border-orange-400 bg-orange-500 text-white'
                        : 'border-slate-300 hover:border-orange-400 dark:border-white/20') +
                      (isToday && !done ? ' ring-1 ring-orange-400/60' : '')
                    }
                  >
                    {done ? '✓' : ''}
                  </button>
                )
              })}
              <button
                onClick={() => remove(h.id)}
                aria-label={t('habit.remove')}
                className="w-5 flex-none text-slate-400 opacity-0 transition hover:text-rose-400 group-hover/h:opacity-100"
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>

      {/* Heatmap 10 tuần gần nhất */}
      {habits.length > 0 && (
        <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('habit.heatmap')}
          </p>
          <div className="grid grid-flow-col grid-rows-7 gap-1">
            {heatDays.map((key) => {
              const f = doneFraction(key)
              const isToday = key === todayKey
              return (
                <div
                  key={key}
                  title={`${key}`}
                  className={
                    'h-2.5 w-2.5 rounded-sm ' +
                    (f === 0 ? 'bg-black/5 dark:bg-white/10' : 'bg-orange-500') +
                    (isToday ? ' ring-1 ring-orange-400' : '')
                  }
                  style={f > 0 ? { opacity: 0.3 + f * 0.7 } : undefined}
                />
              )
            })}
          </div>
        </div>
      )}
    </GlassCard>
  )
}
