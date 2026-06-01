import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { CITIES, GEO_ID } from '../lib/cities'

export function CitySelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const options = [
    { id: GEO_ID, label: t('weather.myLocation') },
    ...CITIES.map((c) => ({ id: c.id, label: c.name })),
  ]
  const current = options.find((o) => o.id === value) ?? options[0]

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

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-lg border border-black/10 bg-black/5 px-2 py-1 text-xs text-slate-700 transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
      >
        <span className="max-w-[8rem] truncate">{current.label}</span>
        <svg
          className={
            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ' +
            (open ? 'rotate-180' : '')
          }
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="animate-dropdown scroll-thin glass absolute right-0 z-50 mt-1.5 max-h-60 w-44 overflow-y-auto rounded-xl p-1 shadow-2xl"
        >
          {options.map((o) => {
            const active = o.id === value
            return (
              <li key={o.id} role="option" aria-selected={active}>
                <button
                  onClick={() => pick(o.id)}
                  className={
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ' +
                    (active
                      ? 'bg-sky-500/20 font-medium text-sky-700 dark:text-sky-200'
                      : 'text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10')
                  }
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {active && <span className="text-sky-500">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
