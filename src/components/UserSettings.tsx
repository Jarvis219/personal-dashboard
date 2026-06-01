import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import {
  exportDashboard,
  importDashboard,
  resetDashboard,
} from '../lib/reset'
import { AVATAR_OPTIONS, useUserStore } from '../store/useUserStore'
import { AuthSection } from './AuthSection'

export function UserSettings() {
  const { t } = useI18n()
  const { name, avatar, setName, setAvatar } = useUserStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [draftName, setDraftName] = useState(name)
  const [draftAvatar, setDraftAvatar] = useState(avatar)
  const [confirmReset, setConfirmReset] = useState(false)

  // Đồng bộ bản nháp với store mỗi khi mở modal.
  useEffect(() => {
    if (open) {
      setDraftName(name)
      setDraftAvatar(avatar)
      setConfirmReset(false)
    }
  }, [open, name, avatar])

  // Đóng bằng phím Esc.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const save = () => {
    setName(draftName.trim())
    setAvatar(draftAvatar)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm transition hover:scale-105"
        aria-label={t('user.aria')}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-lg">
          {avatar}
        </span>
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {name || t('user.guest')}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass scroll-thin max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('user.title')}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-slate-500 transition hover:bg-black/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={t('user.close')}
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <AuthSection />
            </div>

            <div className="mt-4 flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-5xl">
                {draftAvatar}
              </div>
            </div>

            <label className="mt-5 block text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('user.name')}
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder={t('user.namePlaceholder')}
                maxLength={24}
                autoFocus
                className="mt-1 w-full rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-slate-900 outline-none focus:border-indigo-400/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>

            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('user.avatar')}
            </p>
            <div className="mt-2 grid grid-cols-8 gap-1.5">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setDraftAvatar(emoji)}
                  className={
                    'flex aspect-square items-center justify-center rounded-lg text-xl transition ' +
                    (draftAvatar === emoji
                      ? 'bg-indigo-500/30 ring-2 ring-indigo-400'
                      : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10')
                  }
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-black/10 bg-black/5 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {t('user.cancel')}
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-indigo-500/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                {t('user.save')}
              </button>
            </div>

            {/* Sao lưu / khôi phục */}
            <div className="mt-6 border-t border-black/10 pt-4 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('user.backup')}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={exportDashboard}
                  className="flex-1 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  ⬇️ {t('user.export')}
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  ⬆️ {t('user.import')}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) importDashboard(f)
                  }}
                />
              </div>
            </div>

            {/* Vùng nguy hiểm — reset toàn bộ dữ liệu dashboard */}
            <div className="mt-6 border-t border-rose-500/20 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-500/80">
                {t('user.dangerZone')}
              </p>
              {confirmReset ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">
                    {t('user.resetConfirm')}
                  </span>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="rounded-lg border border-black/10 bg-black/5 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    {t('user.no')}
                  </button>
                  <button
                    onClick={resetDashboard}
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-600"
                  >
                    {t('user.deleteAll')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="mt-2 w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-300"
                >
                  {t('user.resetBtn')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
