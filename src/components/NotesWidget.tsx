import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { GlassCard } from './GlassCard'

export function NotesWidget() {
  const { t } = useI18n()
  const [text, setText] = useLocalStorage<string>('dashboard.notes', '')

  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="card-title">{t('notes.title')}</h2>
        {text.length > 0 && (
          <span className="text-[11px] tabular-nums text-slate-600 dark:text-slate-400">
            {t('notes.chars', { n: text.length })}
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('notes.placeholder')}
        className="field scroll-thin mt-3 min-h-40 flex-1 resize-none p-3 leading-relaxed"
      />
    </GlassCard>
  )
}
