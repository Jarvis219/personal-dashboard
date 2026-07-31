import { useEffect } from 'react'
import { useAuthStore } from './auth/useAuthStore'
import { CommandPalette } from './components/CommandPalette'
import { FocusMode } from './components/FocusMode'
import { MergeDialog } from './components/MergeDialog'
import { Toaster } from './components/Toaster'
import { FocusIcon, SearchIcon, XIcon } from './components/icons'
import { useLocalStorage } from './hooks/useLocalStorage'
import { usePomodoroRuntime } from './hooks/usePomodoroRuntime'
import { INITIAL_TITLE, setBaseTitle } from './lib/title'
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
  const [hintDismissed, setHintDismissed] = useLocalStorage<boolean>(
    'dashboard.hintDismissed',
    false,
  )

  // Bíp / thông báo / đếm ngược trên tiêu đề tab — gắn một lần ở đây, KHÔNG đặt
  // trong PomodoroWidget vì widget đó được render cả trong Focus mode.
  usePomodoroRuntime()

  useEffect(() => {
    document.documentElement.lang = lang
    // index.html cứng tiếng Việt (bản dùng cho SEO) -> chỉ đổi tiêu đề tab khi
    // người dùng chọn tiếng Anh, còn lại giữ nguyên bản tĩnh giàu từ khoá.
    setBaseTitle(
      lang === 'en'
        ? 'Personal Dashboard — Clock, weather, to-do, Pomodoro & lo-fi'
        : INITIAL_TITLE,
    )
  }, [lang])

  // Shortcut của PWA manifest: /?action=focus | add
  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get('action')
    if (action === 'focus') setFocus(true)
    if (action === 'add') setPalette(true)
    if (action) window.history.replaceState({}, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Áp dụng theme: bật/tắt class .dark cho glass/chữ + đặt gradient nền.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme.mode === 'dark')
    root.style.setProperty('--aurora-gradient', theme.gradient)
  }, [theme])

  // Đồng bộ cloud khi đăng nhập / dừng khi đăng xuất.
  const userId = useAuthStore((s) => s.user?.id ?? null)
  useEffect(() => {
    if (!userId) return
    void startSync(userId, () => useMergeStore.getState().ask())
    return () => stopSync()
  }, [userId])

  return (
    <div className="bg-aurora relative min-h-full w-full overflow-x-hidden">
      <ParticleBackground mode={theme.mode} />
      <WeatherEffects />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:py-16 xl:max-w-7xl">
        <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 bg-clip-text text-2xl font-bold text-transparent sm:text-4xl dark:from-cyan-300 dark:via-indigo-300 dark:to-violet-300">
              Personal Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t('app.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ba nút icon gom vào một cụm kính duy nhất thay vì ba viên rời. */}
            <div className="glass flex items-center gap-0.5 rounded-full p-1">
              <button
                onClick={() => setPalette(true)}
                aria-label={t('cmd.aria')}
                title={t('cmd.aria')}
                className="icon-btn rounded-full"
              >
                <SearchIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setFocus(true)}
                aria-label={t('focus.aria')}
                title={t('focus.aria')}
                className="icon-btn rounded-full"
              >
                <FocusIcon className="h-5 w-5" />
              </button>
              <WidgetMenu />
            </div>
            <UserSettings />
            <LanguageSelect />
            <ThemeSelect />
          </div>
        </header>

        {/* Gợi ý lần đầu: ⌘K và kéo widget trước đây chỉ nằm trong `title`/
            `aria-label`, tức là chỉ thấy khi hover — trên mobile không bao giờ
            biết chúng tồn tại. */}
        {!hintDismissed && (
          <div className="glass mb-5 flex items-center gap-2 rounded-xl px-3 py-2">
            <p className="flex-1 text-xs muted">{t('hint.tip')}</p>
            <button
              onClick={() => setHintDismissed(true)}
              aria-label={t('hint.dismiss')}
              className="icon-btn h-7 w-7"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <WidgetGrid />
      </main>

      <FocusMode />
      <CommandPalette />
      <MergeDialog />
      <Toaster />
    </div>
  )
}
