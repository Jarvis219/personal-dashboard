import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { fireworks } from '../lib/fireworks'
import {
  alive,
  ensureStamps,
  newId,
  purgeTombstones,
  restore,
  softDelete,
} from '../lib/syncable'
import { useStatsStore } from '../store/useStatsStore'
import { toast, toastUndo } from '../store/useToastStore'
import { useUiStore } from '../store/useUiStore'
import type { Priority, Todo } from '../types'
import { GlassCard } from './GlassCard'
import { CheckIcon, GripIcon, PencilIcon, TrashIcon, XIcon } from './icons'

type Filter = 'all' | 'active' | 'done'

const pad = (n: number) => n.toString().padStart(2, '0')
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const todayKey = () => dateKey(new Date())
const tomorrowKey = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return dateKey(d)
}

const PRIORITY_DOT: Record<Priority, string> = {
  1: 'bg-rose-500',
  2: 'bg-amber-500',
  3: 'bg-slate-400',
}

function TodoRow({
  item,
  draggable,
  onToggle,
  onRemove,
  onPatch,
}: {
  item: Todo
  draggable: boolean
  onToggle: (item: Todo, e: MouseEvent) => void
  onRemove: (item: Todo) => void
  onPatch: (id: string, patch: Partial<Todo>) => void
}) {
  const { t, locale } = useI18n()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !draggable })

  const overdue = !item.done && item.due && item.due < todayKey()
  const dueLabel = item.due
    ? item.due === todayKey()
      ? t('todo.dueToday')
      : item.due === tomorrowKey()
        ? t('todo.dueTomorrow')
        : new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
          }).format(new Date(item.due + 'T00:00:00'))
    : null

  const commit = () => {
    const text = draft.trim()
    if (text && text !== item.text) onPatch(item.id, { text })
    setEditing(false)
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        'group rounded-lg px-1 py-1 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ' +
        (isDragging ? 'relative z-10 opacity-70' : '')
      }
    >
      <div className="flex items-center gap-2">
        {draggable && (
          <button
            {...attributes}
            {...listeners}
            aria-label={t('todo.reorder')}
            title={t('todo.reorder')}
            className="reveal icon-btn h-6 w-5 cursor-grab touch-none active:cursor-grabbing"
          >
            <GripIcon className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          onClick={(e) => onToggle(item, e)}
          className={
            'hit relative flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border transition ' +
            (item.done
              ? 'border-indigo-400 bg-indigo-500 text-white'
              : 'border-slate-400 text-transparent hover:border-indigo-400 dark:border-white/40')
          }
          aria-pressed={item.done}
          aria-label={`${item.text} — ${
            item.done ? t('todo.markUndone') : t('todo.markDone')
          }`}
        >
          <CheckIcon className="h-3 w-3" />
        </button>

        {editing ? (
          <input
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(item.text)
                setEditing(false)
              }
            }}
            aria-label={t('todo.edit')}
            className="field flex-1 py-1"
          />
        ) : (
          <button
            onDoubleClick={() => {
              setDraft(item.text)
              setEditing(true)
            }}
            className={
              // Cho xuống dòng thay vì truncate: trên card 1 cột ở mobile, badge
              // hạn + chấm ưu tiên bóp phần text còn vài chữ.
              'flex-1 break-words text-left text-sm ' +
              (item.done
                ? 'text-slate-500 line-through dark:text-slate-400'
                : 'text-slate-700 dark:text-slate-200')
            }
            title={item.text}
          >
            {item.text}
          </button>
        )}

        {item.priority && item.priority !== 2 && !editing && (
          <span
            className={
              'h-2 w-2 flex-none rounded-full ' + PRIORITY_DOT[item.priority]
            }
            title={`${t('todo.priority')}: ${
              item.priority === 1 ? t('todo.priorityHigh') : t('todo.priorityNormal')
            }`}
          />
        )}

        {dueLabel && !editing && (
          <span
            className={
              'flex-none rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ' +
              (overdue
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'bg-black/[0.06] text-slate-600 dark:bg-white/10 dark:text-slate-300')
            }
            title={overdue ? t('todo.overdue') : t('todo.due')}
          >
            {dueLabel}
          </span>
        )}

        <button
          onClick={() => {
            setDraft(item.text)
            setEditing((v) => !v)
          }}
          aria-label={t('todo.edit')}
          className="reveal icon-btn h-6 w-6"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onRemove(item)}
          aria-label={`${t('todo.delete')} — ${item.text}`}
          className="reveal icon-btn h-6 w-6 hover:text-rose-500"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-7">
          <input
            type="date"
            value={item.due ?? ''}
            onChange={(e) => onPatch(item.id, { due: e.target.value || undefined })}
            aria-label={t('todo.due')}
            className="field py-1 text-xs"
          />
          <button
            onClick={() => onPatch(item.id, { due: todayKey() })}
            className="btn-ghost px-2 py-1 text-xs"
          >
            {t('todo.dueToday')}
          </button>
          <button
            onClick={() => onPatch(item.id, { due: tomorrowKey() })}
            className="btn-ghost px-2 py-1 text-xs"
          >
            {t('todo.dueTomorrow')}
          </button>
          <button
            onClick={() =>
              onPatch(item.id, { priority: item.priority === 1 ? 2 : 1 })
            }
            aria-pressed={item.priority === 1}
            className={
              'rounded-lg px-2 py-1 text-xs font-medium transition ' +
              (item.priority === 1
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'btn-ghost')
            }
          >
            {t('todo.priorityHigh')}
          </button>
          {item.due && (
            <button
              onClick={() => onPatch(item.id, { due: undefined })}
              aria-label={t('todo.dueNone')}
              className="icon-btn h-7 w-7"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export function TodoWidget() {
  const { t, locale } = useI18n()
  const [todos, setTodos] = useLocalStorage<Todo[]>('dashboard.todos', [])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmClear, setConfirmClear] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const logTodoDone = useStatsStore((s) => s.logTodoDone)
  const { selectedDate, setSelectedDate } = useUiStore()

  // Dọn tombstone cũ + gắn dấu thời gian cho item của bản trước (một lần khi mount).
  useEffect(() => {
    setTodos((prev) => {
      const next = ensureStamps(purgeTombstones(prev))
      return next.length === prev.length &&
        next.every((item, i) => item === prev[i])
        ? prev
        : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = useMemo(() => alive(todos), [todos])
  const remaining = items.filter((item) => !item.done).length
  const visible = useMemo(() => {
    let list = items
    // Click một ngày trên Lịch -> chỉ hiện việc có hạn đúng ngày đó.
    if (selectedDate) list = list.filter((item) => item.due === selectedDate)
    if (filter !== 'all')
      list = list.filter((item) => (filter === 'done' ? item.done : !item.done))
    return list
  }, [items, filter, selectedDate])
  // Kéo-thả chỉ bật ở tab "Tất cả" và khi không lọc theo ngày: sắp xếp trên danh
  // sách đã lọc sẽ cho kết quả khó đoán vì các item bị ẩn vẫn nằm giữa.
  const canDrag = filter === 'all' && !selectedDate && items.length > 1

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const patch = (id: string, p: Partial<Todo>) =>
    setTodos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...p, updatedAt: Date.now() } : item,
      ),
    )

  const add = () => {
    const text = input.trim()
    if (!text) return
    if (items.some((item) => item.text.toLowerCase() === text.toLowerCase())) {
      toast(t('todo.duplicate'), 'error')
      return
    }
    setTodos((prev) => [
      {
        id: newId(),
        text,
        done: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...prev,
    ])
    setInput('')
    inputRef.current?.focus() // giữ focus để thêm tiếp liên tục
  }

  const toggle = (item: Todo, e: MouseEvent) => {
    // Bắn pháo hoa khi chuyển từ chưa xong -> xong, ngay tại vị trí nút bấm.
    if (!item.done) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      fireworks.burst(r.left + r.width / 2, r.top + r.height / 2)
    }
    logTodoDone(item.done ? -1 : 1)
    patch(item.id, { done: !item.done })
  }

  const remove = (item: Todo) => {
    setTodos((prev) => softDelete(prev, item.id))
    toastUndo(t('todo.deleted'), t('common.undo'), () =>
      setTodos((prev) => restore(prev, item.id)),
    )
  }

  const clearAll = () => {
    const ids = items.map((item) => item.id)
    setTodos((prev) => ids.reduce((acc, id) => softDelete(acc, id), prev))
    setConfirmClear(false)
    toastUndo(t('todo.deleted'), t('common.undo'), () =>
      setTodos((prev) => ids.reduce((acc, id) => restore(acc, id), prev)),
    )
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((item) => item.id === active.id)
    const to = items.findIndex((item) => item.id === over.id)
    if (from === -1 || to === -1) return
    const reordered = arrayMove(items, from, to)
    // Tombstone giữ lại ở cuối — vị trí của chúng không ảnh hưởng gì.
    setTodos((prev) => [...reordered, ...prev.filter((item) => item.deletedAt)])
  }

  const FILTERS: Filter[] = ['all', 'active', 'done']

  return (
    <GlassCard className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="card-title">{t('todo.title')}</h2>
        {confirmClear ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs muted">{t('todo.clearConfirm')}</span>
            <button
              onClick={clearAll}
              className="rounded-md bg-rose-500 px-2 py-0.5 text-xs font-medium text-white transition hover:bg-rose-600"
            >
              {t('todo.clear')}
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              aria-label={t('user.no')}
              className="icon-btn h-7 w-7"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {items.length > 0 && (
              <span className="badge">{t('todo.remaining', { n: remaining })}</span>
            )}
            {items.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
                aria-label={t('todo.clear')}
                title={t('todo.clear')}
                className="icon-btn h-7 w-7 hover:text-rose-500"
              >
                <TrashIcon className="h-3.5 w-3.5" />
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
          className="field flex-1"
        />
        <button onClick={add} className="btn-primary">
          {t('todo.add')}
        </button>
      </div>

      {/* Đang lọc theo ngày chọn từ Lịch */}
      {selectedDate && (
        <button
          onClick={() => setSelectedDate(null)}
          className="mt-2 flex items-center gap-1.5 self-start rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-500/25 dark:text-indigo-200"
        >
          {new Intl.DateTimeFormat(locale, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }).format(new Date(selectedDate + 'T12:00:00'))}
          <XIcon className="h-3 w-3" />
        </button>
      )}

      {items.length > 0 && !selectedDate && (
        <div className="mt-2 flex gap-1 text-xs">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={
                'rounded-full px-2.5 py-1 font-medium transition ' +
                (filter === f
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                  : 'text-slate-600 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10')
              }
            >
              {t(
                f === 'all'
                  ? 'todo.filterAll'
                  : f === 'active'
                    ? 'todo.filterActive'
                    : 'todo.filterDone',
              )}
            </button>
          ))}
        </div>
      )}

      {/* min-h giữ chiều cao tối thiểu; trên desktop list dùng absolute để lấp đầy
          phần còn lại của card (grid stretch) mà không kéo card cao thêm. */}
      <div className="relative mt-2 min-h-44 flex-1">
        {visible.length === 0 ? (
          <div className="empty-state">
            <CheckIcon className="h-7 w-7 text-slate-400 opacity-40 dark:text-slate-500" />
            <p className="text-sm muted">
              {t(
                items.length === 0
                  ? 'todo.empty'
                  : filter === 'done'
                    ? 'todo.emptyDone'
                    : 'todo.emptyActive',
              )}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={visible.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="scroll-thin space-y-0.5 overflow-y-auto pr-1 md:absolute md:inset-0">
                {visible.map((item) => (
                  <TodoRow
                    key={item.id}
                    item={item}
                    draggable={canDrag}
                    onToggle={toggle}
                    onRemove={remove}
                    onPatch={patch}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </GlassCard>
  )
}
