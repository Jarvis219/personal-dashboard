import { useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { GlassCard } from './GlassCard'

interface Bookmark {
  id: string
  url: string
  title: string
}

let counter = 0
const newId = () => `${Date.now()}-${counter++}`

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

export function BookmarksWidget() {
  const { t } = useI18n()
  const [items, setItems] = useLocalStorage<Bookmark[]>(
    'dashboard.bookmarks',
    [],
  )
  const [url, setUrl] = useState('')
  const [error, setError] = useState(false)

  const add = () => {
    const n = normalizeUrl(url)
    if (!n) {
      setError(true)
      return
    }
    setError(false)
    setItems((prev) => [...prev, { id: newId(), url: n, title: hostOf(n) }])
    setUrl('')
  }

  const remove = (id: string) =>
    setItems((prev) => prev.filter((b) => b.id !== id))

  return (
    <GlassCard glow="hover:shadow-blue-500/20" className="flex flex-col">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-200/70">
        {t('bm.title')}
      </h2>

      <div className="mt-3 flex gap-2">
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t('bm.placeholder')}
          className="min-w-0 flex-1 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-blue-400/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <button
          onClick={add}
          className="rounded-lg bg-blue-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          {t('bm.add')}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-rose-500 dark:text-rose-300/80">
          {t('bm.invalid')}
        </p>
      )}

      <div className="scroll-thin mt-3 grid max-h-44 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
        {items.length === 0 && (
          <p className="col-span-full py-4 text-center text-xs text-slate-500">
            {t('bm.empty')}
          </p>
        )}
        {items.map((b) => (
          <div key={b.id} className="group/bm relative">
            <a
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              title={b.url}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-black/5 bg-black/5 p-2.5 transition hover:bg-black/10 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <img
                src={favicon(b.url)}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded"
                loading="lazy"
              />
              <span className="w-full truncate text-center text-[11px] text-slate-600 dark:text-slate-300">
                {b.title}
              </span>
            </a>
            <button
              onClick={(e) => {
                e.preventDefault()
                remove(b.id)
              }}
              aria-label={t('bm.remove')}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs text-white opacity-0 shadow transition group-hover/bm:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
