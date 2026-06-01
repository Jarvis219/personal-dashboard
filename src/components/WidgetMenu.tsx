import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useWidgetsStore } from '../store/useWidgetsStore'
import { WIDGET_ICON, WIDGET_IDS } from '../widgets/registry'

export function WidgetMenu() {
  const { t } = useI18n()
  const { hidden, toggleHidden } = useWidgetsStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('widget.menu')}
        aria-haspopup="true"
        aria-expanded={open}
        className="glass flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition hover:scale-105 dark:text-slate-200"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
      </button>

      {open && (
        <div className="animate-dropdown glass absolute right-0 z-50 mt-2 w-52 rounded-xl p-2 shadow-2xl">
          <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('widget.menu')}
          </p>
          {WIDGET_IDS.map((id) => {
            const visible = !hidden.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggleHidden(id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <span className="text-base">{WIDGET_ICON[id]}</span>
                <span className="flex-1">{t(`widget.${id}`)}</span>
                <span className={visible ? 'text-indigo-500' : 'text-slate-400'}>
                  {visible ? '👁️' : '🚫'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
