import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode } from '../theme/themes'

interface CustomThemeState {
  mode: ThemeMode
  colors: [string, string, string]
  setMode: (mode: ThemeMode) => void
  setColor: (index: number, value: string) => void
}

// Theme do người dùng tự dựng — lưu localStorage (dashboard.* để reset cuốn theo).
export const useCustomThemeStore = create<CustomThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      colors: ['#0b1026', '#3b0764', '#0b1026'],
      setMode: (mode) => set({ mode }),
      setColor: (index, value) =>
        set((s) => {
          const colors = [...s.colors] as [string, string, string]
          colors[index] = value
          return { colors }
        }),
    }),
    { name: 'dashboard.customTheme' },
  ),
)
