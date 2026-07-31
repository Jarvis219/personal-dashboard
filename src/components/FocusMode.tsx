import { useClock } from '../hooks/useClock'
import { useModal } from '../hooks/useModal'
import { useI18n } from '../i18n/useI18n'
import { useUiStore } from '../store/useUiStore'
import { useUserStore } from '../store/useUserStore'
import { PomodoroWidget } from './PomodoroWidget'
import { XIcon } from './icons'

const pad = (n: number) => n.toString().padStart(2, '0')

export function FocusMode() {
  const { focus, setFocus } = useUiStore()
  const { t } = useI18n()
  const name = useUserStore((s) => s.name)
  const now = useClock()
  const close = () => setFocus(false)
  const ref = useModal<HTMLDivElement>(focus, close)

  if (!focus) return null

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-heading"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 overflow-y-auto bg-slate-950/85 px-4 py-10 backdrop-blur-xl"
    >
      <h2 id="focus-heading" className="sr-only">
        {t('focus.aria')}
      </h2>
      <button
        onClick={close}
        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label={t('focus.exit')}
        title={t('focus.exit')}
      >
        <XIcon className="h-5 w-5" />
      </button>

      <div className="text-center">
        <div className="font-mono text-7xl font-bold tabular-nums text-white sm:text-8xl">
          {pad(now.getHours())}
          <span className="text-cyan-400 motion-safe:animate-pulse">:</span>
          {pad(now.getMinutes())}
        </div>
        {name && (
          <p className="mt-2 text-lg text-slate-300">{t('focus.stay', { name })}</p>
        )}
      </div>

      {/* Cùng một store timer với widget ngoài dashboard — không còn hai đồng hồ
          chạy song song và ghi thống kê gấp đôi. */}
      <div className="w-full max-w-sm">
        <PomodoroWidget />
      </div>
    </div>
  )
}
