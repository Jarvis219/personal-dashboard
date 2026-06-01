import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  ready: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  user: null,
  // Chưa cấu hình Supabase -> coi như sẵn sàng (chế độ khách thuần local).
  ready: !isSupabaseConfigured,
  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  },
  signOut: async () => {
    await supabase.auth.signOut()
  },
}))

// Khởi tạo phiên + lắng nghe thay đổi đăng nhập (1 lần khi load module).
if (isSupabaseConfigured) {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({
      session: data.session,
      user: data.session?.user ?? null,
      ready: true,
    })
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({
      session,
      user: session?.user ?? null,
      ready: true,
    })
  })
}
