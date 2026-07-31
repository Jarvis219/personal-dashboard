import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { CITIES, GEO_ID } from '../lib/cities'
import { CheckIcon, ChevronDownIcon } from './icons'

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
        aria-haspopup="menu"
        aria-controls="city-menu"
        aria-expanded={open}
        aria-label={t('weather.title')}
        className="btn-ghost flex items-center gap-1 px-2 py-1.5 text-xs"
      >
        <span className="max-w-[8rem] truncate">{current.label}</span>
        <ChevronDownIcon
          className={
            'h-3.5 w-3.5 transition-transform duration-200 ' +
            (open ? 'rotate-180' : '')
          }
        />
      </button>

      {open && (
        // `menuitemradio` thay cho `option`: một `li role="option"` KHÔNG được
        // chứa phần tử tương tác, mà mỗi dòng ở đây là một <button>.
        <ul
          id="city-menu"
          role="menu"
          className="animate-dropdown scroll-thin glass-panel absolute right-0 z-50 mt-1.5 max-h-60 w-44 overflow-y-auto rounded-xl p-1 shadow-2xl"
        >
          {options.map((o) => {
            const active = o.id === value
            return (
              <li key={o.id} role="none">
                <button
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => pick(o.id)}
                  className={
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ' +
                    (active
                      ? 'bg-indigo-500/20 font-medium text-indigo-700 dark:text-indigo-200'
                      : 'text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10')
                  }
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {active && <CheckIcon className="h-3.5 w-3.5 flex-none" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
