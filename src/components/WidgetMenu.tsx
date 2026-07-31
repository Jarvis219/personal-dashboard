import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useWidgetsStore } from '../store/useWidgetsStore'
import { WIDGET_ICON, WIDGET_IDS } from '../widgets/registry'
import { GridIcon } from './icons'

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
        className="icon-btn h-10 w-10"
      >
        <GridIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="group"
          aria-label={t('widget.menu')}
          className="animate-dropdown glass-panel absolute right-0 z-50 mt-2 w-52 rounded-xl p-2 shadow-2xl"
        >
          <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {t('widget.menu')}
          </p>
          {WIDGET_IDS.map((id) => {
            const visible = !hidden.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggleHidden(id)}
                // aria-pressed thay cho emoji 👁️/🚫: trình đọc màn hình không
                // suy ra được trạng thái từ emoji.
                aria-pressed={visible}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <span className="text-base" aria-hidden="true">
                  {WIDGET_ICON[id]}
                </span>
                <span className="flex-1">{t(`widget.${id}`)}</span>
                <span
                  aria-hidden="true"
                  className={
                    'h-2.5 w-2.5 rounded-full ' +
                    (visible
                      ? 'bg-indigo-500'
                      : 'border border-slate-400 dark:border-slate-500')
                  }
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
