import { useEffect } from 'react'
import { useClock } from '../hooks/useClock'
import { useI18n } from '../i18n/useI18n'
import { useUiStore } from '../store/useUiStore'
import { useUserStore } from '../store/useUserStore'
import { PomodoroWidget } from './PomodoroWidget'

const pad = (n: number) => n.toString().padStart(2, '0')

export function FocusMode() {
  const { focus, setFocus } = useUiStore()
  const { t } = useI18n()
  const name = useUserStore((s) => s.name)
  const now = useClock()

  useEffect(() => {
    if (!focus) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFocus(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, setFocus])

  if (!focus) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 bg-slate-950/85 px-4 backdrop-blur-xl">
      <button
        onClick={() => setFocus(false)}
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white transition hover:bg-white/20"
        aria-label={t('focus.exit')}
        title={t('focus.exit')}
      >
        ✕
      </button>

      <div className="text-center">
        <div className="font-mono text-7xl font-bold tabular-nums text-white sm:text-8xl">
          {pad(now.getHours())}
          <span className="animate-pulse text-cyan-400">:</span>
          {pad(now.getMinutes())}
        </div>
        {name && (
          <p className="mt-2 text-lg text-slate-300">{t('focus.stay', { name })}</p>
        )}
      </div>

      <div className="w-full max-w-sm">
        <PomodoroWidget />
      </div>
    </div>
  )
}
