import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { GlassCard } from './GlassCard'

export function NotesWidget() {
  const { t } = useI18n()
  const [text, setText] = useLocalStorage<string>('dashboard.notes', '')

  return (
    <GlassCard glow="hover:shadow-yellow-500/20" className="flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-200/70">
          {t('notes.title')}
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {text.length}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('notes.placeholder')}
        className="scroll-thin mt-3 min-h-40 flex-1 resize-none rounded-lg border border-black/10 bg-black/5 p-3 text-sm leading-relaxed text-slate-800 placeholder:text-slate-500 outline-none focus:border-yellow-400/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
      />
    </GlassCard>
  )
}
