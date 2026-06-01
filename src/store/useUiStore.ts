import { create } from 'zustand'

interface UiState {
  focus: boolean
  palette: boolean
  setFocus: (v: boolean) => void
  setPalette: (v: boolean) => void
}

// Trạng thái UI tạm thời (không lưu): focus mode, command palette.
export const useUiStore = create<UiState>((set) => ({
  focus: false,
  palette: false,
  setFocus: (focus) => set({ focus }),
  setPalette: (palette) => set({ palette }),
}))
