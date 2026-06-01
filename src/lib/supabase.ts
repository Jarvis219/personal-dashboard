import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Bật/tắt tính năng cloud tuỳ theo có cấu hình key hay không.
export const isSupabaseConfigured = Boolean(url && anonKey)

// Client dùng chung. Nếu chưa cấu hình env -> tạo client "rỗng" với chuỗi giả
// để app vẫn chạy (chế độ khách thuần local), UI auth sẽ ẩn đi.
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
