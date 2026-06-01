import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../i18n/translations'
import { LANGUAGES, useI18n, useLangStore } from '../i18n/useI18n'

export function LanguageSelect() {
  const { t, lang } = useI18n()
  const setLang = useLangStore((s) => s.setLang)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]

  // Đóng khi click ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (code: Lang) => {
    setLang(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('lang.aria')}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="glass flex h-11 items-center gap-1.5 rounded-full pl-3 pr-2.5 transition hover:scale-105"
      >
        <span className="text-lg" aria-hidden="true">
          {current.flag}
        </span>
        <span className="text-sm font-bold uppercase text-slate-700 dark:text-slate-200">
          {current.code}
        </span>
        <svg
          className={
            'h-4 w-4 text-slate-500 transition-transform duration-200 dark:text-slate-400 ' +
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
          className="animate-dropdown glass absolute right-0 z-50 mt-2 w-44 origin-top-right overflow-hidden rounded-xl p-1 shadow-2xl"
        >
          {LANGUAGES.map((l) => {
            const active = l.code === lang
            return (
              <li key={l.code} role="option" aria-selected={active}>
                <button
                  onClick={() => pick(l.code)}
                  className={
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ' +
                    (active
                      ? 'bg-indigo-500/20 font-semibold text-indigo-700 dark:text-indigo-200'
                      : 'text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10')
                  }
                >
                  <span className="text-lg" aria-hidden="true">
                    {l.flag}
                  </span>
                  <span className="flex-1">{l.label}</span>
                  {active && <span className="text-indigo-500">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
