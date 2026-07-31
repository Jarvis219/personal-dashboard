import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useCustomThemeStore } from '../store/useCustomThemeStore'
import {
  CUSTOM_ID,
  THEMES,
  type ThemeMode,
  buildCustomTheme,
  themeById,
} from '../theme/themes'
import { useThemeStore } from '../theme/useThemeStore'
import { CheckIcon } from './icons'

export function ThemeSelect() {
  const { t } = useI18n()
  const { themeId, setThemeId } = useThemeStore()
  const customStore = useCustomThemeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const customTheme = buildCustomTheme(customStore.mode, customStore.colors)
  const current =
    themeId === CUSTOM_ID ? customTheme : themeById(themeId)

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

  const pick = (id: string) => setThemeId(id)

  const changeColor = (i: number, value: string) => {
    customStore.setColor(i, value)
    setThemeId(CUSTOM_ID) // chỉnh màu là áp dụng theme tùy chỉnh ngay
  }
  const changeMode = (mode: ThemeMode) => {
    customStore.setMode(mode)
    setThemeId(CUSTOM_ID)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('theme.aria')}
        aria-haspopup="true"
        aria-controls="theme-panel"
        aria-expanded={open}
        className="glass flex h-11 w-11 items-center justify-center rounded-full transition hover:scale-105"
      >
        <span
          className="h-5 w-5 rounded-full ring-2 ring-black/20 dark:ring-white/30"
          style={{ background: current.swatch }}
          aria-hidden="true"
        />
      </button>

      {open && (
        // KHÔNG dùng role="listbox": panel này còn chứa toggle sáng/tối và 3 ô
        // chọn màu, tức là những con không hợp lệ của một listbox.
        <div
          id="theme-panel"
          role="group"
          aria-label={t('theme.pick')}
          className="animate-dropdown glass-panel absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl p-2 shadow-2xl"
        >
          <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {t('theme.pick')}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {THEMES.map((th) => {
              const active = th.id === themeId
              return (
                <button
                  key={th.id}
                  aria-pressed={active}
                  onClick={() => pick(th.id)}
                  title={th.name}
                  className={
                    'flex flex-col items-center gap-1 rounded-lg p-1.5 transition ' +
                    (active
                      ? 'bg-black/5 dark:bg-white/10'
                      : 'hover:bg-black/5 dark:hover:bg-white/10')
                  }
                >
                  <span
                    className={
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs ' +
                      (active
                        ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-transparent'
                        : 'ring-1 ring-black/10 dark:ring-white/20')
                    }
                    style={{ background: th.swatch }}
                  >
                    {active && <CheckIcon className="h-4 w-4 text-white drop-shadow" />}
                  </span>
                  <span className="max-w-full truncate text-[11px] text-slate-700 dark:text-slate-300">
                    {th.name}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ---- Bộ dựng theme tùy chỉnh ---- */}
          <div className="divider-t mt-2 pt-2">
            <div className="flex items-center justify-between px-1">
              <span
                className={
                  'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ' +
                  (themeId === CUSTOM_ID
                    ? 'text-indigo-600 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-400')
                }
              >
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                  style={{ background: customTheme.swatch }}
                />
                {t('theme.custom')}
              </span>
              <div className="flex gap-0.5 rounded-full bg-black/5 p-0.5 dark:bg-white/5">
                {(['light', 'dark'] as ThemeMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => changeMode(m)}
                    aria-pressed={customStore.mode === m}
                    className={
                      'rounded-full px-2 py-1 text-[11px] font-medium transition ' +
                      (customStore.mode === m
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
                    }
                  >
                    {m === 'light' ? t('theme.light') : t('theme.dark')}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-2">
              {customStore.colors.map((c, i) => (
                <input
                  key={i}
                  type="color"
                  value={c}
                  onChange={(e) => changeColor(i, e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent dark:border-white/10"
                  aria-label={`${t('theme.custom')} ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
