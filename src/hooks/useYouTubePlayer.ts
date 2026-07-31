import { useEffect, useMemo, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null

// Tải IFrame API 1 lần duy nhất.
function loadApi(): Promise<void> {
  if (window.YT && window.YT.Player) return Promise.resolve()
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return apiPromise
}

export function useYouTubePlayer(onEnded: () => void) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  useEffect(() => {
    let cancelled = false
    loadApi().then(() => {
      if (cancelled || !containerRef.current || playerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: any) => {
            const YT = window.YT
            setPlaying(e.data === YT.PlayerState.PLAYING)
            const d = playerRef.current?.getDuration?.() ?? 0
            if (d) setDuration(d)
            if (e.data === YT.PlayerState.ENDED) onEndedRef.current()
          },
        },
      })
    })
    return () => {
      cancelled = true
      try {
        playerRef.current?.destroy?.()
      } catch {
        /* ignore */
      }
      playerRef.current = null
    }
  }, [])

  // Cập nhật thanh tua trong khi đang phát.
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const p = playerRef.current
      if (p?.getCurrentTime) {
        setCurrentTime(p.getCurrentTime())
        const d = p.getDuration?.() ?? 0
        if (d) setDuration(d)
      }
    }, 500)
    return () => clearInterval(id)
  }, [playing])

  // Các hàm điều khiển giữ nguyên tham chiếu qua mọi lần render, nhờ vậy component
  // dùng được chúng làm dependency của effect. Bản trước trả về object mới mỗi
  // render nên effect đồng bộ âm lượng chạy lại liên tục (mỗi 500ms khi đang phát).
  const api = useMemo(
    () => ({
      load: (videoId: string) => {
        playerRef.current?.loadVideoById(videoId)
        setCurrentTime(0)
        setDuration(0)
      },
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      stop: () => {
        try {
          playerRef.current?.stopVideo?.()
        } catch {
          /* ignore */
        }
        setCurrentTime(0)
        setDuration(0)
      },
      seek: (s: number) => {
        playerRef.current?.seekTo(s, true)
        setCurrentTime(s)
      },
      setVolume: (v: number) =>
        playerRef.current?.setVolume?.(Math.round(v * 100)),
    }),
    [],
  )

  return { containerRef, ready, playing, currentTime, duration, api }
}
