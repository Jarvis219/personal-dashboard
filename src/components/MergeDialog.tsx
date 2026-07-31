import { useModal } from '../hooks/useModal'
import { useI18n } from '../i18n/useI18n'
import type { MergeChoice } from '../lib/sync'
import { useMergeStore } from '../store/useMergeStore'

export function MergeDialog() {
  const { t } = useI18n()
  const { open, choose } = useMergeStore()
  // Không cho Esc đóng: hộp thoại này BẮT BUỘC phải có lựa chọn, đóng ngang sẽ
  // để `startSync` treo mãi ở await.
  const ref = useModal<HTMLDivElement>(open, () => {}, { closeOnEscape: false })

  if (!open) return null

  const options: {
    id: MergeChoice
    label: string
    desc: string
    primary?: boolean
  }[] = [
    {
      id: 'merge',
      label: t('merge.merge'),
      desc: t('merge.mergeDesc'),
      primary: true,
    },
    { id: 'cloud', label: t('merge.cloud'), desc: t('merge.cloudDesc') },
    { id: 'guest', label: t('merge.guest'), desc: t('merge.guestDesc') },
  ]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-heading"
        aria-describedby="merge-desc"
        className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl"
      >
        <h2
          id="merge-heading"
          className="text-lg font-bold text-slate-900 dark:text-white"
        >
          {t('merge.title')}
        </h2>
        <p id="merge-desc" className="mt-1 text-sm muted">
          {t('merge.desc')}
        </p>
        <div className="mt-4 space-y-2">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => choose(o.id)}
              className={
                'w-full rounded-xl border p-3 text-left transition ' +
                (o.primary
                  ? 'border-indigo-400/50 bg-indigo-500/10 hover:bg-indigo-500/20'
                  : 'border-black/10 bg-black/[0.04] hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10')
              }
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {o.label}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {o.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
