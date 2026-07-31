import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  /** Nhãn nút hành động (thường là "Hoàn tác"). */
  actionLabel?: string
  onAction?: () => void
  tone?: 'default' | 'error'
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>, ttl?: number) => void
  dismiss: (id: number) => void
}

let seq = 0

// Thông báo tạm thời + chỗ neo cho Hoàn tác. Cũng là vùng aria-live duy nhất
// của app, nên mọi lỗi/kết quả cần đọc cho screen reader nên đi qua đây.
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t, ttl = 6000) => {
    const id = ++seq
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    window.setTimeout(() => get().dismiss(id), ttl)
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (message: string, tone: Toast['tone'] = 'default') =>
  useToastStore.getState().push({ message, tone })

/** Thông báo kèm nút Hoàn tác — dùng cho mọi thao tác xoá. */
export const toastUndo = (
  message: string,
  actionLabel: string,
  onAction: () => void,
) => useToastStore.getState().push({ message, actionLabel, onAction })
