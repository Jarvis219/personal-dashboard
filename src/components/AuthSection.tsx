import { useAuthStore } from '../auth/useAuthStore'
import { useI18n } from '../i18n/useI18n'
import { isSupabaseConfigured } from '../lib/supabase'

export function AuthSection() {
  const { t } = useI18n()
  const { user, signInWithGoogle, signOut } = useAuthStore()

  return (
    <div className="border-b border-black/10 pb-4 dark:border-white/10">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t('auth.account')}
      </p>

      {!isSupabaseConfigured ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t('auth.notConfigured')}
        </p>
      ) : user ? (
        <div className="mt-2 flex items-center gap-3">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url as string}
              alt=""
              className="h-9 w-9 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-base">
              👤
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {user.email}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400">
              {t('auth.synced')}
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-black/10 bg-black/5 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {t('auth.signOut')}
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <button
            onClick={() => signInWithGoogle()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
              />
            </svg>
            {t('auth.signIn')}
          </button>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t('auth.guestNote')}
          </p>
        </div>
      )}
    </div>
  )
}
