import { useI18n } from '../i18n/useI18n'
import { useToastStore } from '../store/useToastStore'

// Vùng aria-live duy nhất của app: thông báo tạm thời + nút Hoàn tác.
export function Toaster() {
  const { t } = useI18n()
  const { toasts, dismiss } = useToastStore()

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className={
            'glass-panel pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 shadow-xl ' +
            (item.tone === 'error' ? 'border-rose-500/40' : '')
          }
        >
          <span
            className={
              'flex-1 text-sm ' +
              (item.tone === 'error'
                ? 'text-rose-600 dark:text-rose-300'
                : 'text-slate-700 dark:text-slate-200')
            }
          >
            {item.message}
          </span>
          {item.actionLabel && (
            <button
              onClick={() => {
                item.onAction?.()
                dismiss(item.id)
              }}
              className="flex-none rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
            >
              {item.actionLabel}
            </button>
          )}
          <button
            onClick={() => dismiss(item.id)}
            aria-label={t('common.dismiss')}
            className="flex-none rounded-md p-1 text-slate-500 transition hover:bg-black/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
