import { useEffect } from 'react'
import { useAuthStore } from './auth/useAuthStore'
import { CommandPalette } from './components/CommandPalette'
import { FocusMode } from './components/FocusMode'
import { MergeDialog } from './components/MergeDialog'
import { startSync, stopSync } from './lib/sync'
import { useMergeStore } from './store/useMergeStore'
import { LanguageSelect } from './components/LanguageSelect'
import { ParticleBackground } from './components/ParticleBackground'
import { WeatherEffects } from './components/WeatherEffects'
import { ThemeSelect } from './components/ThemeSelect'
import { UserSettings } from './components/UserSettings'
import { WidgetGrid } from './components/WidgetGrid'
import { WidgetMenu } from './components/WidgetMenu'
import { useI18n } from './i18n/useI18n'
import { CUSTOM_ID, buildCustomTheme, themeById } from './theme/themes'
import { useThemeStore } from './theme/useThemeStore'
import { useCustomThemeStore } from './store/useCustomThemeStore'
import { useUiStore } from './store/useUiStore'

export default function App() {
  const { t, lang } = useI18n()
  const { setFocus, setPalette } = useUiStore()
  const themeId = useThemeStore((s) => s.themeId)
  const custom = useCustomThemeStore()
  const theme =
    themeId === CUSTOM_ID
      ? buildCustomTheme(custom.mode, custom.colors)
      : themeById(themeId)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // Áp dụng theme: bật/tắt class .dark cho glass/chữ + đặt gradient nền.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme.mode === 'dark')
    root.style.setProperty('--aurora-gradient', theme.gradient)
  }, [theme])

  // Đồng bộ cloud khi đăng nhập / dừng khi đăng xuất.
  const userId = useAuthStore((s) => s.user?.id ?? null)
  useEffect(() => {
    if (userId) {
      startSync(userId, () => useMergeStore.getState().ask())
    }
    return () => {
      if (userId) stopSync()
    }
  }, [userId])

  return (
    <div className="bg-aurora relative min-h-full w-full overflow-x-hidden">
      <ParticleBackground mode={theme.mode} />
      <WeatherEffects />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:py-16 xl:max-w-7xl">
        <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 bg-clip-text text-2xl font-bold text-transparent sm:text-4xl dark:from-cyan-300 dark:via-indigo-300 dark:to-violet-300">
              Personal Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('app.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPalette(true)}
              aria-label={t('cmd.aria')}
              title={t('cmd.aria')}
              className="glass flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition hover:scale-105 dark:text-slate-200"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
            <button
              onClick={() => setFocus(true)}
              aria-label={t('focus.aria')}
              title={t('focus.aria')}
              className="glass flex h-11 w-11 items-center justify-center rounded-full text-lg transition hover:scale-105"
            >
              🧘
            </button>
            <UserSettings />
            <WidgetMenu />
            <LanguageSelect />
            <ThemeSelect />
          </div>
        </header>

        <WidgetGrid />
      </main>

      <FocusMode />
      <CommandPalette />
      <MergeDialog />
    </div>
  )
}
