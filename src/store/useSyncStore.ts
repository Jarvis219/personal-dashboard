import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

interface SyncState {
  status: SyncStatus
  lastSyncedAt: number | null
  set: (status: SyncStatus) => void
  markSynced: () => void
}

// Trạng thái đồng bộ THẬT. Trước đây UI luôn hiện "Đã đồng bộ ☁️" chỉ vì có
// `user`, kể cả khi mọi lần ghi lên cloud đều lỗi.
export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  set: (status) => set({ status }),
  markSynced: () => set({ status: 'synced', lastSyncedAt: Date.now() }),
}))
