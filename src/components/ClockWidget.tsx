import { periodForHour, useClock } from '../hooks/useClock'
import { useI18n } from '../i18n/useI18n'
import { useUiStore } from '../store/useUiStore'
import { useUserStore } from '../store/useUserStore'
import { GlassCard } from './GlassCard'

const pad = (n: number) => n.toString().padStart(2, '0')

// Câu chào phụ theo ngày trong tuần.
function dayTag(day: number): 'weekend' | 'monday' | 'friday' | 'midweek' {
  if (day === 0 || day === 6) return 'weekend'
  if (day === 1) return 'monday'
  if (day === 5) return 'friday'
  return 'midweek'
}

export function ClockWidget() {
  const now = useClock()
  const { t, locale } = useI18n()
  const name = useUserStore((s) => s.name)
  const openSettings = useUiStore((s) => s.openSettings)
  const greeting = t(`greeting.${periodForHour(now.getHours())}`)
  const tagline = t(`greeting.tag.${dayTag(now.getDay())}`)
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)
  const timeLabel = `${pad(now.getHours())}:${pad(now.getMinutes())}`

  return (
    <GlassCard className="flex flex-col items-center justify-center text-center">
      {/* Spacer bằng chiều cao heading của các card khác để nội dung hàng đầu
          thẳng trục ngang (card này không có tiêu đề). */}
      <div className="h-5 w-full" aria-hidden="true" />

      <p className="text-sm font-medium tracking-wide text-slate-700 dark:text-slate-300">
        {greeting}
        {name ? `, ${name}` : ''} 👋
      </p>

      {/* Giá trị đọc được cho screen reader là giờ:phút, cập nhật im lặng —
          nếu để nguyên phần giây thì trình đọc sẽ đọc lại mỗi giây. */}
      <div
        className="mt-2 font-mono text-6xl font-bold tabular-nums text-slate-900 sm:text-7xl dark:text-white"
        role="timer"
        aria-live="off"
        aria-label={timeLabel}
      >
        <span aria-hidden="true">
          {pad(now.getHours())}
          <span className="text-indigo-500 motion-safe:animate-pulse dark:text-indigo-400">
            :
          </span>
          {pad(now.getMinutes())}
          <span className="ml-0.5 align-super text-xl text-slate-500 dark:text-slate-400">
            {pad(now.getSeconds())}
          </span>
        </span>
      </div>

      <p className="mt-3 text-base muted">{dateLabel}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{tagline}</p>

      {/* Tên trống -> mời đặt tên. Trước đây header chỉ hiện "Khách" mà không có
          chỗ nào gợi ý rằng bấm vào đó là mở hồ sơ. */}
      {!name && (
        <button
          onClick={() => openSettings()}
          className="mt-3 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300"
        >
          {t('user.setName')}
        </button>
      )}
    </GlassCard>
  )
}
