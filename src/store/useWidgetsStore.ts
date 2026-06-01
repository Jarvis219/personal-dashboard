import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WIDGET_IDS, type WidgetId } from '../widgets/registry'

interface WidgetsState {
  order: WidgetId[]
  hidden: WidgetId[]
  setOrder: (order: WidgetId[]) => void
  toggleHidden: (id: WidgetId) => void
}

// Thứ tự + trạng thái ẩn của các widget — lưu localStorage (dashboard.* để reset cuốn theo).
export const useWidgetsStore = create<WidgetsState>()(
  persist(
    (set) => ({
      order: WIDGET_IDS,
      hidden: [],
      setOrder: (order) => set({ order }),
      toggleHidden: (id) =>
        set((s) => ({
          hidden: s.hidden.includes(id)
            ? s.hidden.filter((x) => x !== id)
            : [...s.hidden, id],
        })),
    }),
    { name: 'dashboard.widgets' },
  ),
)
