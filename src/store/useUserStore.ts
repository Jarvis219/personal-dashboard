import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserState {
  name: string
  avatar: string
  setName: (name: string) => void
  setAvatar: (avatar: string) => void
}

// Hồ sơ người dùng — tạm thời lưu vào localStorage qua persist middleware.
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      name: '',
      avatar: '🦊',
      setName: (name) => set({ name }),
      setAvatar: (avatar) => set({ avatar }),
    }),
    { name: 'dashboard.user' },
  ),
)

export const AVATAR_OPTIONS = [
  '🦊',
  '🐱',
  '🐼',
  '🐧',
  '🦉',
  '🐸',
  '🦄',
  '🐯',
  '🚀',
  '🌙',
  '⭐',
  '🌸',
  '🎧',
  '🔥',
  '💜',
  '😎',
]
