// Thông báo hệ thống + tiếng bíp cho Pomodoro.
//
// Trước đây hết phiên chỉ có `beep()` bằng Web Audio: đổi sang tab khác là mất
// hẳn tín hiệu. Trên iOS Safari, Notification chỉ hoạt động khi app đã được
// "Thêm vào màn hình chính" — nên mọi thứ ở đây đều fail im lặng, không chặn UI.

export const notificationsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window

export const notificationPermission = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported'

/** Xin quyền — chỉ gọi từ một hành động thật của người dùng. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function notify(title: string, body?: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.svg', tag: 'pomodoro' })
  } catch {
    /* ignore */
  }
}

// Một AudioContext dùng lại cho mọi tiếng bíp. Bản cũ tạo context mới mỗi lần
// và không bao giờ close -> tích tụ tới ngưỡng giới hạn của trình duyệt rồi tắt tiếng.
let ctx: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctx) return null
  try {
    ctx = new Ctx()
    return ctx
  } catch {
    return null
  }
}

export function beep(times = 1) {
  const audio = audioContext()
  if (!audio) return
  void audio.resume().catch(() => {})
  for (let i = 0; i < times; i++) {
    const at = audio.currentTime + i * 0.28
    try {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.frequency.value = 660
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)
      osc.start(at)
      osc.stop(at + 0.24)
    } catch {
      /* ignore */
    }
  }
}
