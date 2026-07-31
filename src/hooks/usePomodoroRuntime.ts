import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/useI18n'
import { beep, notify } from '../lib/notify'
import { overrideTitle, releaseTitle } from '../lib/title'
import { usePomodoroStore } from '../store/usePomodoroStore'

const pad = (n: number) => n.toString().padStart(2, '0')

/**
 * Tác dụng phụ của Pomodoro — gắn MỘT LẦN ở App, không đặt trong widget.
 *
 * Widget được render ở hai nơi (dashboard và Focus mode); nếu để bíp/thông báo/
 * ghi thống kê trong component thì mọi thứ chạy hai lần.
 */
export function usePomodoroRuntime() {
  const { t } = useI18n()
  const endsAt = usePomodoroStore((s) => s.endsAt)
  const finishedAt = usePomodoroStore((s) => s.finishedAt)
  const finishedMode = usePomodoroStore((s) => s.finishedMode)
  const tRef = useRef(t)
  tRef.current = t

  // Đồng hồ chạy: kiểm tra hết hạn thường xuyên. Tab nền bị throttle nhưng không
  // sao — mốc kết thúc là tuyệt đối, tick chỉ để phát hiện, không để đếm.
  useEffect(() => {
    const tick = () => usePomodoroStore.getState().tick()
    tick()
    if (!endsAt) return
    const id = window.setInterval(tick, 250)
    const onVisible = () => tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [endsAt])

  // Hết phiên -> bíp + thông báo hệ thống (kể cả khi đang ở tab khác).
  useEffect(() => {
    if (!finishedAt || !finishedMode) return
    beep(finishedMode === 'work' ? 2 : 1)
    notify(
      tRef.current('pomodoro.title'),
      tRef.current(
        finishedMode === 'work'
          ? 'pomodoro.notifyWorkDone'
          : 'pomodoro.notifyBreakDone',
      ),
    )
    usePomodoroStore.getState().clearFinished()
  }, [finishedAt, finishedMode])

  // Đếm ngược trên tiêu đề tab -> thấy được thời gian còn lại khi ở tab khác.
  useEffect(() => {
    if (!endsAt) {
      releaseTitle()
      return
    }
    const render = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      const mode = usePomodoroStore.getState().mode
      const label = tRef.current(
        mode === 'work' ? 'pomodoro.work' : 'pomodoro.break',
      )
      overrideTitle(
        `${pad(Math.floor(left / 60))}:${pad(left % 60)} · ${label}`,
      )
    }
    render()
    const id = window.setInterval(render, 1000)
    return () => {
      clearInterval(id)
      releaseTitle()
    }
  }, [endsAt])
}
