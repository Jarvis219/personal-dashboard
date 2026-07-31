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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  alive,
  ensureStamps,
  newId,
  purgeTombstones,
  restore,
  softDelete,
} from '../lib/syncable'
import { toast, toastUndo } from '../store/useToastStore'
import type { Bookmark } from '../types'
import { GlassCard } from './GlassCard'
import { GripIcon, PencilIcon, TrashIcon } from './icons'

function normalizeUrl(raw: string): string | null {
  let u = raw.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try {
    new URL(u)
    return u
  } catch {
    return null
  }
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

const favicon = (u: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(u))}&sz=64`

function BookmarkTile({
  item,
  onRemove,
  onRename,
}: {
  item: Bookmark
  onRemove: (b: Bookmark) => void
  onRename: (id: string, title: string) => void
}) {
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.title)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={'group relative ' + (isDragging ? 'z-10 opacity-70' : '')}
    >
      {/* Listener kéo-thả nằm ở tay kéo riêng, KHÔNG đặt trên <a>: gắn lên link
          thì cú bấm mở tab và cú kéo tranh nhau cùng một pointer event. */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        title={item.url}
        className="flex flex-col items-center gap-1.5 rounded-xl border border-black/5 bg-black/[0.04] p-2.5 transition hover:bg-black/[0.08] dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
      >
        {failed ? (
          // Favicon phụ thuộc dịch vụ của Google -> offline hoặc bị chặn thì phải
          // có gì đó thay thế, không để ô trống.
          <span className="flex h-8 w-8 items-center justify-center rounded bg-indigo-500/20 text-sm font-semibold uppercase text-indigo-700 dark:text-indigo-200">
            {hostOf(item.url).charAt(0)}
          </span>
        ) : (
          <img
            src={favicon(item.url)}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        )}
        {editing ? (
          <input
            value={draft}
            autoFocus
            onClick={(e) => e.preventDefault()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const title = draft.trim()
              if (title) onRename(item.id, title)
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditing(false)
            }}
            aria-label={t('bm.rename')}
            className="field w-full px-1 py-0.5 text-center text-[11px]"
          />
        ) : (
          <span className="w-full truncate text-center text-[11px] text-slate-700 dark:text-slate-300">
            {item.title}
          </span>
        )}
      </a>

      <button
        onClick={(e) => {
          e.preventDefault()
          setDraft(item.title)
          setEditing(true)
        }}
        aria-label={`${t('bm.rename')} — ${item.title}`}
        className="reveal icon-btn absolute -left-1 -top-1 h-5 w-5 rounded-full bg-slate-700 text-white shadow hover:bg-slate-600"
      >
        <PencilIcon className="h-3 w-3" />
      </button>
      <button
        {...attributes}
        {...listeners}
        aria-label={t('bm.reorder')}
        title={t('bm.reorder')}
        className="reveal icon-btn absolute -bottom-1 -left-1 h-5 w-5 cursor-grab touch-none rounded-full bg-slate-700 text-white shadow hover:bg-slate-600 active:cursor-grabbing"
      >
        <GripIcon className="h-3 w-3" />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault()
          onRemove(item)
        }}
        aria-label={`${t('bm.remove')} — ${item.title}`}
        className="reveal icon-btn absolute -right-1 -top-1 h-5 w-5 rounded-full bg-rose-500 text-white shadow hover:bg-rose-600"
      >
        <TrashIcon className="h-3 w-3" />
      </button>
    </div>
  )
}

export function BookmarksWidget() {
  const { t } = useI18n()
  const [stored, setStored] = useLocalStorage<Bookmark[]>(
    'dashboard.bookmarks',
    [],
  )
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    setStored((prev) => {
      const next = ensureStamps(purgeTombstones(prev))
      return next.length === prev.length &&
        next.every((item, i) => item === prev[i])
        ? prev
        : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = useMemo(() => alive(stored), [stored])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const add = () => {
    const n = normalizeUrl(url)
    if (!n) {
      setError(true)
      return
    }
    if (items.some((b) => b.url === n)) {
      toast(t('bm.duplicate'), 'error')
      return
    }
    setError(false)
    setStored((prev) => [
      ...prev,
      { id: newId(), url: n, title: hostOf(n), updatedAt: Date.now() },
    ])
    setUrl('')
  }

  const remove = (b: Bookmark) => {
    setStored((prev) => softDelete(prev, b.id))
    toastUndo(t('bm.deleted'), t('common.undo'), () =>
      setStored((prev) => restore(prev, b.id)),
    )
  }

  const rename = (id: string, title: string) =>
    setStored((prev) =>
      prev.map((b) => (b.id === id ? { ...b, title, updatedAt: Date.now() } : b)),
    )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((b) => b.id === active.id)
    const to = items.findIndex((b) => b.id === over.id)
    if (from === -1 || to === -1) return
    const reordered = arrayMove(items, from, to)
    setStored((prev) => [...reordered, ...prev.filter((b) => b.deletedAt)])
  }

  return (
    <GlassCard className="flex flex-col">
      <h2 className="card-title">{t('bm.title')}</h2>

      <div className="mt-3 flex gap-2">
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t('bm.placeholder')}
          className="field flex-1"
        />
        <button onClick={add} className="btn-primary">
          {t('bm.add')}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-300">
          {t('bm.invalid')}
        </p>
      )}

      {items.length === 0 ? (
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
            <path d="M6 4h12v16l-6-4-6 4Z" />
          </svg>
          <p className="text-sm muted">{t('bm.empty')}</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((b) => b.id)}
            strategy={rectSortingStrategy}
          >
            <div className="scroll-thin mt-3 grid flex-1 grid-cols-3 gap-2 overflow-y-auto pr-1 md:max-h-44 sm:grid-cols-4">
              {items.map((b) => (
                <BookmarkTile
                  key={b.id}
                  item={b}
                  onRemove={remove}
                  onRename={rename}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </GlassCard>
  )
}
