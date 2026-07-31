import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../auth/useAuthStore'
import { useModal } from '../hooks/useModal'
import { useI18n } from '../i18n/useI18n'
import {
  applyBackup,
  exportDashboard,
  readBackup,
  resetDashboard,
} from '../lib/reset'
import { toast } from '../store/useToastStore'
import { useUiStore } from '../store/useUiStore'
import { AVATAR_OPTIONS, useUserStore } from '../store/useUserStore'
import { AuthSection } from './AuthSection'
import { DownloadIcon, UploadIcon, XIcon } from './icons'

export function UserSettings() {
  const { t } = useI18n()
  const { name, avatar, setName, setAvatar } = useUserStore()
  const { settings: open, settingsDanger, openSettings, closeSettings } =
    useUiStore()
  const signedIn = useAuthStore((s) => s.user !== null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [draftName, setDraftName] = useState(name)
  const [draftAvatar, setDraftAvatar] = useState(avatar)
  const [confirmReset, setConfirmReset] = useState(false)
  const [alsoClearCloud, setAlsoClearCloud] = useState(true)
  const [pendingImport, setPendingImport] = useState<Record<
    string,
    unknown
  > | null>(null)
  const ref = useModal<HTMLDivElement>(open, closeSettings)

  // Đồng bộ bản nháp với store mỗi khi mở modal.
  useEffect(() => {
    if (open) {
      setDraftName(name)
      setDraftAvatar(avatar)
      setConfirmReset(settingsDanger)
      setPendingImport(null)
    }
  }, [open, name, avatar, settingsDanger])

  const save = () => {
    setName(draftName.trim())
    setAvatar(draftAvatar)
    closeSettings()
  }

  const pickFile = async (file: File) => {
    try {
      // Đọc & kiểm tra TRƯỚC, chưa ghi gì — rồi mới hỏi xác nhận. Bản trước ghi
      // đè toàn bộ localStorage ngay lập tức và nuốt luôn lỗi parse.
      setPendingImport(await readBackup(file))
    } catch {
      toast(t('user.importError'), 'error')
    }
  }

  return (
    <>
      <button
        onClick={() => openSettings()}
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
          onClick={closeSettings}
        >
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-heading"
            className="glass-panel scroll-thin max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2
                id="settings-heading"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                {t('user.title')}
              </h2>
              <button
                onClick={closeSettings}
                className="icon-btn"
                aria-label={t('user.close')}
              >
                <XIcon className="h-4 w-4" />
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

            <label className="mt-5 block text-sm font-medium muted">
              {t('user.name')}
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder={t('user.namePlaceholder')}
                maxLength={24}
                className="field mt-1 w-full"
              />
            </label>

            <p className="mt-4 text-sm font-medium muted">{t('user.avatar')}</p>
            <div
              className="mt-2 grid grid-cols-8 gap-1.5"
              role="radiogroup"
              aria-label={t('user.avatar')}
            >
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setDraftAvatar(emoji)}
                  role="radio"
                  aria-checked={draftAvatar === emoji}
                  aria-label={emoji}
                  className={
                    'flex aspect-square items-center justify-center rounded-lg text-xl transition ' +
                    (draftAvatar === emoji
                      ? 'bg-indigo-500/30 ring-2 ring-indigo-400'
                      : 'bg-black/[0.05] hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10')
                  }
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={closeSettings} className="btn-ghost">
                {t('user.cancel')}
              </button>
              <button onClick={save} className="btn-primary px-4">
                {t('user.save')}
              </button>
            </div>

            {/* Sao lưu / khôi phục */}
            <div className="divider-t mt-6 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t('user.backup')}
              </p>
              {pendingImport ? (
                <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm muted">
                    {t('user.importConfirm', {
                      n: Object.keys(pendingImport).length,
                    })}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setPendingImport(null)}
                      className="btn-ghost flex-1 py-1.5 text-xs"
                    >
                      {t('user.cancel')}
                    </button>
                    <button
                      onClick={() => applyBackup(pendingImport)}
                      className="btn-primary flex-1 py-1.5 text-xs"
                    >
                      {t('user.importBtn')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      const n = exportDashboard()
                      if (n) toast(t('user.exported'))
                    }}
                    className="btn-ghost flex flex-1 items-center justify-center gap-1.5"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    {t('user.export')}
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-ghost flex flex-1 items-center justify-center gap-1.5"
                  >
                    <UploadIcon className="h-4 w-4" />
                    {t('user.import')}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      // Reset value: nếu không, chọn lại đúng file vừa chọn sẽ
                      // không phát sinh sự kiện change nào.
                      e.target.value = ''
                      if (f) void pickFile(f)
                    }}
                  />
                </div>
              )}
            </div>

            {/* Vùng nguy hiểm — reset toàn bộ dữ liệu dashboard */}
            <div className="mt-6 border-t border-rose-500/20 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                {t('user.dangerZone')}
              </p>
              {confirmReset ? (
                <div className="mt-2">
                  <p className="text-sm muted">{t('user.resetConfirm')}</p>
                  {/* Đang đăng nhập thì xoá local là vô nghĩa: sau reload dữ liệu
                      được kéo lại từ cloud. Bỏ tick = đăng xuất về chế độ khách. */}
                  {signedIn && (
                    <label className="mt-2 flex items-start gap-2 text-xs muted">
                      <input
                        type="checkbox"
                        checked={alsoClearCloud}
                        onChange={(e) => setAlsoClearCloud(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-rose-500"
                      />
                      {t('user.resetCloud')}
                    </label>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="btn-ghost flex-1 py-1.5"
                    >
                      {t('user.no')}
                    </button>
                    <button
                      onClick={() =>
                        void resetDashboard({ clearCloud: alsoClearCloud })
                      }
                      className="flex-1 rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-600"
                    >
                      {t('user.deleteAll')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="mt-2 w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300"
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
