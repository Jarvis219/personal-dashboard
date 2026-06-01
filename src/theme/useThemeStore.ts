import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_THEME } from './themes'

interface ThemeState {
  themeId: string
  setThemeId: (id: string) => void
}

// Theme hiện tại — lưu localStorage (cùng prefix dashboard.* để reset cuốn theo).
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: DEFAULT_THEME,
      setThemeId: (themeId) => set({ themeId }),
    }),
    { name: 'dashboard.theme' },
  ),
)
