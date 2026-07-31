import { type MouseEvent, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { fireworks } from '../lib/fireworks'
import { prefersReducedMotion } from '../hooks/useReducedMotion'
import {
  alive,
  ensureStamps,
  newId,
  purgeTombstones,
  restore,
  softDelete,
} from '../lib/syncable'
import { toast, toastUndo } from '../store/useToastStore'
import type { Habit } from '../types'
import { GlassCard } from './GlassCard'
import { CheckIcon, PencilIcon, TrashIcon } from './icons'

const pad = (n: number) => n.toString().padStart(2, '0')
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const shiftKey = (base: Date, delta: number) => {
  const d = new Date(base)
  d.setDate(d.getDate() + delta)
  return dateKey(d)
}

/**
 * Chuỗi ngày liên tiếp. Bắt đầu từ hôm nay nếu hôm nay đã tick, ngược lại tính
 * tới hôm qua — nếu không thì cứ sang ngày mới là 🔥 biến mất dù hôm qua vừa đủ
 * 30 ngày, gây cảm giác mất streak oan.
 */
function streakOf(done: Record<string, boolean>): number {
  const today = new Date()
  let offset = done[dateKey(today)] ? 0 : -1
  let count = 0
  while (done[shiftKey(today, offset)]) {
    count++
    offset--
  }
  return count
}

/** Chuỗi dài nhất từng đạt — quét toàn bộ ngày đã tick. */
function bestStreakOf(done: Record<string, boolean>): number {
  const keys = Object.keys(done)
    .filter((k) => done[k])
    .sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const k of keys) {
    run = prev && shiftKey(new Date(k + 'T00:00:00'), -1) === prev ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return best
}

const MILESTONES = [7, 30, 100]

// Ăn mừng lớn khi đạt mốc streak: nhiều đợt pháo hoa.
function celebrate() {
  if (prefersReducedMotion()) return
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setHabits((prev) => {
      const next = ensureStamps(purgeTombstones(prev))
      return next.length === prev.length &&
        next.every((item, i) => item === prev[i])
        ? prev
        : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = useMemo(() => alive(habits), [habits])
  const today = new Date()
  const todayKey = dateKey(today)
  // 7 ngày gần nhất, kết thúc ở hôm nay.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 6 + i)
    return d
  })
  const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  const dayLabel = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  })

  const patch = (id: string, p: Partial<Habit>) =>
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...p, updatedAt: Date.now() } : h)),
    )

  const add = () => {
    const name = input.trim()
    if (!name) return
    if (items.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
      toast(t('todo.duplicate'), 'error')
      return
    }
    setHabits((prev) => [
      ...prev,
      {
        id: newId(),
        name,
        done: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ])
    setInput('')
  }

  const remove = (habit: Habit) => {
    setHabits((prev) => softDelete(prev, habit.id))
    toastUndo(t('habit.deleted'), t('common.undo'), () =>
      setHabits((prev) => restore(prev, habit.id)),
    )
  }

  const toggle = (habit: Habit, key: string, e: MouseEvent) => {
    const wasDone = habit.done[key]
    if (!wasDone && key === todayKey) {
      if (!prefersReducedMotion()) {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
        fireworks.burst(r.left + r.width / 2, r.top + r.height / 2, 28)
      }
      // Đạt mốc streak -> ăn mừng lớn.
      if (MILESTONES.includes(streakOf({ ...habit.done, [key]: true })))
        celebrate()
    }
    patch(habit.id, { done: { ...habit.done, [key]: !wasDone } })
  }

  /**
   * Tỉ lệ hoàn thành của MỘT ngày, mẫu số là số thói quen đã tồn tại vào ngày đó.
   * Trước đây luôn chia theo số thói quen hiện tại, nên thêm một thói quen mới là
   * toàn bộ lịch sử quá khứ tự nhạt đi (1 habit tick đủ 70 ngày, thêm cái thứ 2
   * → cả 70 ngày tụt từ 1.0 xuống 0.5).
   */
  const doneFraction = (key: string) => {
    const existing = items.filter(
      (h) => !h.createdAt || dateKey(new Date(h.createdAt)) <= key,
    )
    if (!existing.length) return { fraction: 0, done: 0, total: 0 }
    const done = existing.filter((h) => h.done[key]).length
    return { fraction: done / existing.length, done, total: existing.length }
  }

  const heatDays = Array.from({ length: 70 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 69 + i)
    return dateKey(d)
  })

  return (
    <GlassCard className="flex flex-col">
      <h2 className="card-title">{t('habit.title')}</h2>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t('habit.placeholder')}
          className="field flex-1"
        />
        <button onClick={add} className="btn-primary">
          {t('habit.add')}
        </button>
      </div>

      {/* Header thứ — căn phải để thẳng cột với hàng ô tick bên dưới. */}
      {items.length > 0 && (
        <div className="mt-3 flex items-center justify-end gap-1.5 pr-1 text-[11px] text-slate-600 dark:text-slate-400">
          {days.map((d, i) => (
            <span key={i} className="w-7 text-center uppercase">
              {narrow.format(d)}
            </span>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <CheckIcon className="h-7 w-7 text-slate-400 opacity-40 dark:text-slate-500" />
          <p className="text-sm muted">{t('habit.empty')}</p>
        </div>
      ) : (
        <ul className="scroll-thin mt-1 max-h-56 flex-1 space-y-1 overflow-y-auto pr-1 md:max-h-48">
          {items.map((h) => {
            const streak = streakOf(h.done)
            const best = bestStreakOf(h.done)
            return (
              // Hai dòng: tên ở trên, 7 ô tick ở dưới. Một dòng thì 7 ô ngày +
              // 2 nút hành động ăn hết bề ngang của card 1 cột, bóp tên xuống 0.
              <li
                key={h.id}
                className="group flex flex-col gap-1 rounded-lg px-1 py-1.5 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2">
                {editingId === h.id ? (
                  <input
                    value={draft}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => {
                      const name = draft.trim()
                      if (name) patch(h.id, { name })
                      setEditingId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    aria-label={t('habit.rename')}
                    className="field flex-1 py-1"
                  />
                ) : (
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <button
                      onDoubleClick={() => {
                        setDraft(h.name)
                        setEditingId(h.id)
                      }}
                      className="truncate text-left text-sm text-slate-700 dark:text-slate-200"
                      title={h.name}
                    >
                      {h.name}
                    </button>
                    {streak > 0 && (
                      <span
                        className="flex-none text-xs font-medium text-orange-600 dark:text-orange-400"
                        title={t('habit.best', { n: best })}
                      >
                        🔥{streak}
                      </span>
                    )}
                  </span>
                )}

                  <button
                    onClick={() => {
                      setDraft(h.name)
                      setEditingId(editingId === h.id ? null : h.id)
                    }}
                    aria-label={t('habit.rename')}
                    className="reveal icon-btn h-6 w-6"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(h)}
                    aria-label={`${t('habit.remove')} — ${h.name}`}
                    className="reveal icon-btn h-6 w-6 hover:text-rose-500"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-end gap-1.5 pr-1">
                  {days.map((d, i) => {
                    const key = dateKey(d)
                    const done = !!h.done[key]
                    const isToday = key === todayKey
                    return (
                      <button
                        key={i}
                        onClick={(e) => toggle(h, key, e)}
                        aria-pressed={done}
                        aria-label={t('habit.toggleAria', {
                          name: h.name,
                          date: dayLabel.format(d),
                          state: t(
                            done ? 'habit.stateDone' : 'habit.stateNotDone',
                          ),
                        })}
                        className={
                          'hit relative flex h-7 w-7 flex-none items-center justify-center rounded-md border text-white transition ' +
                          (done
                            ? 'border-orange-400 bg-orange-500'
                            : 'border-slate-300 hover:border-orange-400 dark:border-white/25') +
                          (isToday && !done ? ' ring-1 ring-orange-400/60' : '')
                        }
                      >
                        {done && <CheckIcon className="h-3.5 w-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Heatmap 10 tuần gần nhất */}
      {items.length > 0 && (
        <div className="divider-t mt-3 pt-3">
          <p className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {t('habit.heatmap')}
          </p>
          <div className="grid grid-flow-col grid-rows-7 gap-1">
            {heatDays.map((key) => {
              const { fraction, done, total } = doneFraction(key)
              const isToday = key === todayKey
              return (
                <div
                  key={key}
                  title={`${key} — ${t('habit.heatCount', { done, total })}`}
                  className={
                    'h-2.5 w-2.5 rounded-sm ' +
                    (fraction === 0
                      ? 'bg-black/[0.07] dark:bg-white/10'
                      : 'bg-orange-500') +
                    (isToday ? ' ring-1 ring-orange-400' : '')
                  }
                  style={
                    fraction > 0 ? { opacity: 0.35 + fraction * 0.65 } : undefined
                  }
                />
              )
            })}
          </div>
        </div>
      )}
    </GlassCard>
  )
}
