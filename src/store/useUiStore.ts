import { create } from 'zustand'

interface UiState {
  focus: boolean
  palette: boolean
  /** Modal hồ sơ/cài đặt — mở được từ nhiều nơi (header, bảng lệnh, lời mời đặt tên). */
  settings: boolean
  /** Mở thẳng vùng nguy hiểm ở trạng thái chờ xác nhận xoá. */
  settingsDanger: boolean
  /** 'YYYY-MM-DD' — ngày đang chọn trên Lịch; Todo lọc theo hạn của ngày này. */
  selectedDate: string | null
  setFocus: (v: boolean) => void
  setPalette: (v: boolean) => void
  openSettings: (danger?: boolean) => void
  closeSettings: () => void
  setSelectedDate: (v: string | null) => void
}

// Trạng thái UI tạm thời (không lưu): focus mode, command palette, modal cài đặt,
// ngày đang chọn.
export const useUiStore = create<UiState>((set) => ({
  focus: false,
  palette: false,
  settings: false,
  settingsDanger: false,
  selectedDate: null,
  setFocus: (focus) => set({ focus }),
  setPalette: (palette) => set({ palette }),
  openSettings: (danger = false) =>
    set({ settings: true, settingsDanger: danger }),
  closeSettings: () => set({ settings: false, settingsDanger: false }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
}))
