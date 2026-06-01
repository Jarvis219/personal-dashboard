import { create } from 'zustand'
import type { MergeChoice } from '../lib/sync'

interface MergeState {
  open: boolean
  resolver: ((c: MergeChoice) => void) | null
  // Mở hộp thoại và chờ người dùng chọn.
  ask: () => Promise<MergeChoice>
  choose: (c: MergeChoice) => void
}

export const useMergeStore = create<MergeState>((set, get) => ({
  open: false,
  resolver: null,
  ask: () =>
    new Promise<MergeChoice>((resolve) => {
      set({ open: true, resolver: resolve })
    }),
  choose: (c) => {
    get().resolver?.(c)
    set({ open: false, resolver: null })
  },
}))
