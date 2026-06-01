import { useEffect, useMemo, useRef, useState } from 'react'
import { LANGUAGES, useI18n, useLangStore } from '../i18n/useI18n'
import { exportDashboard, resetDashboard } from '../lib/reset'
import { useUiStore } from '../store/useUiStore'
import { useWidgetsStore } from '../store/useWidgetsStore'
import { THEMES } from '../theme/themes'
import { useThemeStore } from '../theme/useThemeStore'
import { WIDGET_ICON, WIDGET_IDS } from '../widgets/registry'

interface Command {
  id: string
  label: string
  icon: string
  run: () => void
}

export function CommandPalette() {
  const { t } = useI18n()
  const { palette, setPalette, setFocus } = useUiStore()
  const setThemeId = useThemeStore((s) => s.setThemeId)
  const setLang = useLangStore((s) => s.setLang)
  const { hidden, toggleHidden } = useWidgetsStore()
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

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
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [palette])

  const close = () => setPalette(false)

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = []
    cmds.push({
      id: 'focus',
      icon: '🧘',
      label: t('cmd.focus'),
      run: () => setFocus(true),
    })
    THEMES.forEach((th) =>
      cmds.push({
        id: `theme-${th.id}`,
        icon: '🎨',
        label: `${t('cmd.theme')}: ${th.name}`,
        run: () => setThemeId(th.id),
      }),
    )
    LANGUAGES.forEach((l) =>
      cmds.push({
        id: `lang-${l.code}`,
        icon: l.flag,
        label: `${t('cmd.language')}: ${l.label}`,
        run: () => setLang(l.code),
      }),
    )
    WIDGET_IDS.forEach((id) => {
      const isHidden = hidden.includes(id)
      cmds.push({
        id: `widget-${id}`,
        icon: WIDGET_ICON[id],
        label: `${isHidden ? t('cmd.show') : t('cmd.hide')}: ${t(`widget.${id}`)}`,
        run: () => toggleHidden(id),
      })
    })
    cmds.push({
      id: 'export',
      icon: '⬇️',
      label: t('cmd.export'),
      run: exportDashboard,
    })
    cmds.push({
      id: 'reset',
      icon: '♻️',
      label: t('cmd.reset'),
      run: resetDashboard,
    })
    return cmds
  }, [t, hidden, setThemeId, setLang, toggleHidden, setFocus])

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  )

  const exec = (c?: Command) => {
    if (!c) return
    c.run()
    close()
  }

  if (!palette) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="glass w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((s) => Math.min(s + 1, filtered.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((s) => Math.max(s - 1, 0))
            } else if (e.key === 'Enter') {
              exec(filtered[sel])
            } else if (e.key === 'Escape') {
              close()
            }
          }}
          placeholder={t('cmd.placeholder')}
          className="w-full border-b border-black/10 bg-transparent px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none dark:border-white/10 dark:text-white"
        />
        <ul className="scroll-thin max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-500">
              {t('cmd.empty')}
            </li>
          )}
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={() => exec(c)}
                onMouseEnter={() => setSel(i)}
                className={
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ' +
                  (i === sel
                    ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-200'
                    : 'text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10')
                }
              >
                <span className="text-base">{c.icon}</span>
                <span className="flex-1">{c.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
