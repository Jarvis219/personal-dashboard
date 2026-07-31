import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { handoffOnSignOut } from '../lib/sync'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  ready: boolean
  pending: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  // Chưa cấu hình Supabase -> coi như sẵn sàng (chế độ khách thuần local).
  ready: !isSupabaseConfigured,
  pending: false,
  error: null,
  signInWithGoogle: async () => {
    set({ pending: true, error: null })
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
      // Thành công -> trang sẽ chuyển hướng, giữ `pending` để nút không bấm lại được.
    } catch {
      set({ pending: false, error: 'signIn' })
    }
  },
  signOut: async () => {
    set({ pending: true, error: null })
    try {
      // Đẩy nốt thay đổi rồi DỌN dữ liệu của tài khoản khỏi máy này, nếu không
      // người đăng nhập tiếp theo sẽ bị hỏi gộp dữ liệu của người trước.
      await handoffOnSignOut()
      await supabase.auth.signOut()
    } finally {
      // Bắt buộc reload: localStorage đã bị dọn nhưng state trong RAM (zustand
      // persist + useLocalStorage) vẫn giữ dữ liệu của người vừa đăng xuất, và
      // sẽ ghi ngược trở lại ngay lần cập nhật kế tiếp.
      location.reload()
    }
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
      pending: false,
    })
  })
}
