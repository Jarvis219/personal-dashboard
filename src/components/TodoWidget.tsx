import { type MouseEvent, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { fireworks } from '../lib/fireworks'
import type { Todo } from '../types'
import { GlassCard } from './GlassCard'

let counter = 0
const newId = () => `${Date.now()}-${counter++}`

export function TodoWidget() {
  const { t } = useI18n()
  const [todos, setTodos] = useLocalStorage<Todo[]>('dashboard.todos', [])
  const [input, setInput] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = todos.filter((item) => !item.done).length

  const clearAll = () => {
    setTodos([])
    setConfirmClear(false)
  }

  const add = () => {
    const text = input.trim()
    if (!text) return
    setTodos((prev) => [
      { id: newId(), text, done: false, createdAt: Date.now() },
      ...prev,
    ])
    setInput('')
    inputRef.current?.focus() // giữ focus để thêm tiếp liên tục
  }

  const toggle = (id: string, e: MouseEvent) => {
    const target = todos.find((item) => item.id === id)
    // Bắn pháo hoa khi chuyển từ chưa xong -> xong, ngay tại vị trí nút bấm.
    if (target && !target.done) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      fireworks.burst(r.left + r.width / 2, r.top + r.height / 2)
    }
    setTodos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    )
  }

  const remove = (id: string) =>
    setTodos((prev) => prev.filter((item) => item.id !== id))

  return (
    <GlassCard glow="hover:shadow-violet-500/20" className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-200/70">
          {t('todo.title')}
        </h2>
        {confirmClear ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {t('todo.clearConfirm')}
            </span>
            <button
              onClick={clearAll}
              className="rounded-md bg-rose-500 px-2 py-0.5 text-xs font-medium text-white transition hover:bg-rose-600"
            >
              {t('todo.clear')}
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="rounded-md border border-black/10 px-2 py-0.5 text-xs text-slate-600 transition hover:bg-black/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              aria-label={t('user.no')}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-200">
              {t('todo.remaining', { n: remaining })}
            </span>
            {todos.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
                className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-black/5 hover:text-rose-500 dark:text-slate-500 dark:hover:bg-white/10"
                aria-label={t('todo.clear')}
                title={t('todo.clear')}
              >
                🗑
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t('todo.placeholder')}
          className="min-w-0 flex-1 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-violet-400/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <button
          onClick={add}
          className="rounded-lg bg-violet-500/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
        >
          {t('todo.add')}
        </button>
      </div>

      {/* Vùng list dùng absolute để không kéo chiều cao card -> card cao bằng
          Pomodoro (qua grid stretch), list lấp đầy và cuộn bên trong. */}
      <div className="relative mt-3 min-h-48 flex-1">
        <ul className="scroll-thin absolute inset-0 space-y-1.5 overflow-y-auto pr-1">
          {todos.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-500">
              {t('todo.empty')}
            </li>
          )}
          {todos.map((item) => (
          <li
            key={item.id}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-black/5 dark:hover:bg-white/5"
          >
            <button
              onClick={(e) => toggle(item.id, e)}
              className={
                'flex h-5 w-5 flex-none items-center justify-center rounded-md border text-xs transition ' +
                (item.done
                  ? 'border-violet-400 bg-violet-500 text-white'
                  : 'border-slate-400 text-transparent hover:border-violet-400 dark:border-white/30')
              }
              aria-label={item.done ? t('todo.markUndone') : t('todo.markDone')}
            >
              ✓
            </button>
            <span
              className={
                'flex-1 text-sm ' +
                (item.done
                  ? 'text-slate-400 line-through dark:text-slate-500'
                  : 'text-slate-700 dark:text-slate-200')
              }
            >
              {item.text}
            </span>
            <button
              onClick={() => remove(item.id)}
              className="flex-none text-slate-500 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
              aria-label={t('todo.delete')}
            >
              ✕
            </button>
          </li>
          ))}
        </ul>
      </div>
    </GlassCard>
  )
}
