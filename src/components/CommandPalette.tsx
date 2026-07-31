import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useModal } from '../hooks/useModal'
import { LANGUAGES, useI18n, useLangStore } from '../i18n/useI18n'
import { exportDashboard } from '../lib/reset'
import { alive, newId } from '../lib/syncable'
import { toast } from '../store/useToastStore'
import { useUiStore } from '../store/useUiStore'
import { useWidgetsStore } from '../store/useWidgetsStore'
import { THEMES } from '../theme/themes'
import { useThemeStore } from '../theme/useThemeStore'
import type { Bookmark, Todo } from '../types'
import { WIDGET_ICON, WIDGET_IDS } from '../widgets/registry'

type Group =
  | 'quick'
  | 'todo'
  | 'bookmarks'
  | 'actions'
  | 'widgets'
  | 'theme'
  | 'lang'
  | 'danger'

interface Command {
  id: string
  label: string
  icon: string
  group: Group
  run: () => void
  /** Cần bấm Enter lần thứ hai để chạy (hành động phá huỷ). */
  confirm?: boolean
}

const GROUP_ORDER: Group[] = [
  'quick',
  'todo',
  'bookmarks',
  'actions',
  'widgets',
  'theme',
  'lang',
  'danger',
]

const GROUP_LABEL: Record<Group, string> = {
  quick: 'cmd.groupQuick',
  todo: 'cmd.groupTodo',
  bookmarks: 'cmd.groupBookmarks',
  actions: 'cmd.groupActions',
  widgets: 'cmd.groupWidgets',
  theme: 'cmd.groupTheme',
  lang: 'cmd.groupLang',
  danger: 'cmd.groupDanger',
}

export function CommandPalette() {
  const { t } = useI18n()
  const { palette, setPalette, setFocus, openSettings } = useUiStore()
  const setThemeId = useThemeStore((s) => s.setThemeId)
  const setLang = useLangStore((s) => s.setLang)
  const { hidden, toggleHidden } = useWidgetsStore()
  const [todos, setTodos] = useLocalStorage<Todo[]>('dashboard.todos', [])
  const [bookmarks] = useLocalStorage<Bookmark[]>('dashboard.bookmarks', [])
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const [armed, setArmed] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const close = () => setPalette(false)
  const ref = useModal<HTMLDivElement>(palette, close)

  // Mở/đóng bằng Cmd/Ctrl + K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(!useUiStore.getState().palette)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPalette])

  useEffect(() => {
    if (palette) {
      setQuery('')
      setSel(0)
      setArmed(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [palette])

  const addTodo = (text: string) => {
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
    toast(t('cmd.addTodo', { text }))
  }

  const trimmed = query.trim()
  // Tiền tố `+` = thêm việc nhanh, không phải tìm lệnh.
  const quickAdd = trimmed.startsWith('+') ? trimmed.slice(1).trim() : ''

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = []

    if (quickAdd) {
      cmds.push({
        id: 'quick-add',
        icon: '✅',
        group: 'quick',
        label: t('cmd.addTodo', { text: quickAdd }),
        run: () => addTodo(quickAdd),
      })
      return cmds
    }

    // Dữ liệu của chính người dùng — điều bảng lệnh trước đây hoàn toàn không có.
    alive(todos)
      .slice(0, 40)
      .forEach((item) =>
        cmds.push({
          id: `todo-${item.id}`,
          icon: item.done ? '☑️' : '⬜',
          group: 'todo',
          label: item.text,
          run: () =>
            setTodos((prev) =>
              prev.map((x) =>
                x.id === item.id
                  ? { ...x, done: !x.done, updatedAt: Date.now() }
                  : x,
              ),
            ),
        }),
      )

    alive(bookmarks)
      .slice(0, 40)
      .forEach((b) =>
        cmds.push({
          id: `bm-${b.id}`,
          icon: '🔖',
          group: 'bookmarks',
          label: b.title,
          run: () => window.open(b.url, '_blank', 'noopener,noreferrer'),
        }),
      )

    cmds.push({
      id: 'focus',
      icon: '🧘',
      group: 'actions',
      label: t('cmd.focus'),
      run: () => setFocus(true),
    })
    cmds.push({
      id: 'settings',
      icon: '⚙️',
      group: 'actions',
      label: t('user.title'),
      run: () => openSettings(),
    })
    cmds.push({
      id: 'export',
      icon: '⬇️',
      group: 'actions',
      label: t('cmd.export'),
      run: () => {
        const n = exportDashboard()
        if (n) toast(t('user.exported'))
      },
    })

    WIDGET_IDS.forEach((id) => {
      const isHidden = hidden.includes(id)
      cmds.push({
        id: `widget-${id}`,
        icon: WIDGET_ICON[id],
        group: 'widgets',
        label: `${isHidden ? t('cmd.show') : t('cmd.hide')}: ${t(`widget.${id}`)}`,
        run: () => toggleHidden(id),
      })
    })

    THEMES.forEach((th) =>
      cmds.push({
        id: `theme-${th.id}`,
        icon: '🎨',
        group: 'theme',
        label: `${t('cmd.theme')}: ${th.name}`,
        run: () => setThemeId(th.id),
      }),
    )

    LANGUAGES.forEach((l) =>
      cmds.push({
        id: `lang-${l.code}`,
        icon: l.flag,
        group: 'lang',
        label: `${t('cmd.language')}: ${l.label}`,
        run: () => setLang(l.code),
      }),
    )

    // Reset không còn chạy ngay khi Enter: trước đây gõ "reset" + Enter là xoá
    // sạch dữ liệu, trong khi cùng hành động đó ở Cài đặt có 2 bước xác nhận.
    cmds.push({
      id: 'reset',
      icon: '♻️',
      group: 'danger',
      label: t('cmd.reset'),
      confirm: true,
      run: () => openSettings(true),
    })
    return cmds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, hidden, todos, bookmarks, quickAdd, setThemeId, setLang, toggleHidden])

  const filtered = useMemo(() => {
    if (!trimmed || quickAdd) return commands
    const q = trimmed.toLowerCase()
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, trimmed, quickAdd])

  // Cuộn mục đang chọn vào tầm nhìn — danh sách cao 18rem nên dùng ↓ là đi ra
  // ngoài khung rất nhanh.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${sel}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [sel, filtered.length])

  const exec = (c?: Command) => {
    if (!c) return
    if (c.confirm && armed !== c.id) {
      setArmed(c.id)
      return
    }
    c.run()
    close()
  }

  if (!palette) return null

  let cursor = -1

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="palette-heading"
        className="glass-panel w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="palette-heading" className="sr-only">
          {t('cmd.aria')}
        </h2>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSel(0)
            setArmed(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((s) => Math.min(s + 1, filtered.length - 1))
              setArmed(null)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((s) => Math.max(s - 1, 0))
              setArmed(null)
            } else if (e.key === 'Enter') {
              exec(filtered[sel])
            }
            // Escape do useModal xử lý ở tầng window -> vẫn đóng được sau khi
            // focus đã rời khỏi input.
          }}
          placeholder={t('cmd.placeholder')}
          aria-label={t('cmd.placeholder')}
          className="w-full border-b border-black/10 bg-transparent px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-500 dark:border-white/12 dark:text-white dark:placeholder:text-slate-400"
        />
        <ul ref={listRef} className="scroll-thin max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm muted">{t('cmd.empty')}</li>
          )}
          {GROUP_ORDER.map((group) => {
            const rows = filtered.filter((c) => c.group === group)
            if (!rows.length) return null
            return (
              <li key={group}>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t(GROUP_LABEL[group])}
                </p>
                <ul>
                  {rows.map((c) => {
                    cursor++
                    const i = cursor
                    const isArmed = armed === c.id
                    return (
                      <li key={c.id} data-index={i}>
                        <button
                          onClick={() => exec(c)}
                          onMouseEnter={() => setSel(i)}
                          className={
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ' +
                            (isArmed
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-200'
                              : i === sel
                                ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-200'
                                : group === 'danger'
                                  ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-300'
                                  : 'text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10')
                          }
                        >
                          <span className="text-base" aria-hidden="true">
                            {c.icon}
                          </span>
                          <span className="flex-1 truncate">
                            {isArmed ? t('cmd.resetConfirm') : c.label}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
        <p className="border-t border-black/10 px-4 py-2 text-[11px] text-slate-600 dark:border-white/12 dark:text-slate-400">
          {t('cmd.footer')}
        </p>
      </div>
    </div>
  )
}
