import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useWeatherStore } from '../store/useWeatherStore'

// Lớp phủ canvas vẽ hiệu ứng bầu trời theo thời tiết: nắng / đêm sao /
// âm u / mưa / tuyết. Không bắt sự kiện chuột.
export function WeatherEffects() {
  const sky = useWeatherStore((s) => s.sky)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (sky === 'none' || reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let raf = 0
    let frame = 0

    // ----- dữ liệu cho từng loại -----
    let drops: { x: number; y: number; z: number; len: number }[] = []
    let stars: { x: number; y: number; r: number; ph: number }[] = []
    let clouds: { x: number; y: number; s: number; v: number; o: number }[] = []
    let sun = { x: 0, y: 0 }

    const seed = () => {
      sun = { x: w * 0.82, y: h * 0.16 }
      if (sky === 'rain' || sky === 'snow') {
        const n = sky === 'snow' ? 90 : 160
        drops = Array.from({ length: n }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          z: 0.5 + Math.random(),
          len: sky === 'snow' ? 1.5 + Math.random() * 2.5 : 8 + Math.random() * 12,
        }))
      }
      if (sky === 'clear-night') {
        stars = Array.from({ length: 90 }, () => ({
          x: Math.random() * w,
          y: Math.random() * h * 0.7,
          r: Math.random() * 1.3 + 0.3,
          ph: Math.random() * Math.PI * 2,
        }))
      }
      if (sky === 'cloudy') {
        // Giữ mây ở dải trên và làm nhạt hẳn. Trước đây mây rải tới 48% chiều
        // cao với opacity tới 0.24, và vì canvas nằm z-0 SAU các card trong mờ
        // nên nó hiện thành vệt xám nhoè BÊN TRONG card Đồng hồ / Pomodoro —
        // trông như lỗi render chứ không phải hiệu ứng.
        clouds = Array.from({ length: 6 }, () => ({
          x: Math.random() * w,
          y: h * (0.02 + Math.random() * 0.16),
          s: 0.6 + Math.random() * 0.9,
          v: 0.15 + Math.random() * 0.25,
          o: 0.06 + Math.random() * 0.06,
        }))
      }
    }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const drawCloud = (x: number, y: number, s: number, o: number) => {
      ctx.fillStyle = `rgba(120,130,150,${o})`
      const blobs = [
        [0, 0, 34],
        [30, 6, 26],
        [-30, 8, 24],
        [12, -14, 24],
        [-14, -10, 20],
      ]
      for (const [dx, dy, r] of blobs) {
        ctx.beginPath()
        ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const draw = () => {
      frame++
      ctx.clearRect(0, 0, w, h)

      if (sky === 'clear-day') {
        // Quầng sáng mặt trời
        const grd = ctx.createRadialGradient(
          sun.x,
          sun.y,
          0,
          sun.x,
          sun.y,
          240,
        )
        grd.addColorStop(0, 'rgba(255,224,130,0.55)')
        grd.addColorStop(0.4, 'rgba(255,200,90,0.18)')
        grd.addColorStop(1, 'rgba(255,200,90,0)')
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, w, h)
        // Đĩa mặt trời
        ctx.fillStyle = 'rgba(255,236,150,0.95)'
        ctx.beginPath()
        ctx.arc(sun.x, sun.y, 34, 0, Math.PI * 2)
        ctx.fill()
        // Tia nắng quay nhẹ
        ctx.save()
        ctx.translate(sun.x, sun.y)
        ctx.rotate(frame * 0.0015)
        ctx.strokeStyle = 'rgba(255,224,130,0.35)'
        ctx.lineWidth = 2
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(Math.cos(a) * 46, Math.sin(a) * 46)
          ctx.lineTo(Math.cos(a) * 64, Math.sin(a) * 64)
          ctx.stroke()
        }
        ctx.restore()
      } else if (sky === 'clear-night') {
        // Sao lấp lánh
        for (const s of stars) {
          const a = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.03 + s.ph))
          ctx.fillStyle = `rgba(255,255,255,${a})`
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
        // Quầng sáng + mặt trăng
        const grd = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 120)
        grd.addColorStop(0, 'rgba(226,232,240,0.35)')
        grd.addColorStop(1, 'rgba(226,232,240,0)')
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = 'rgba(241,245,249,0.95)'
        ctx.beginPath()
        ctx.arc(sun.x, sun.y, 28, 0, Math.PI * 2)
        ctx.fill()
        // Khuyết trăng (đè 1 đĩa nền lệch)
        ctx.fillStyle = 'rgba(2,6,23,0.9)'
        ctx.beginPath()
        ctx.arc(sun.x + 11, sun.y - 6, 26, 0, Math.PI * 2)
        ctx.fill()
      } else if (sky === 'cloudy') {
        for (const c of clouds) {
          c.x += c.v
          if (c.x - 80 * c.s > w) c.x = -80 * c.s
          drawCloud(c.x, c.y, c.s, c.o)
        }
      } else if (sky === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        for (const d of drops) {
          d.y += d.z * 0.8
          d.x += Math.sin((d.y + d.x) / 40) * 0.4
          if (d.y > h) {
            d.y = -5
            d.x = Math.random() * w
          }
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.len, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (sky === 'rain') {
        ctx.strokeStyle = 'rgba(160,190,230,0.45)'
        ctx.lineWidth = 1.1
        for (const d of drops) {
          d.y += d.z * 12
          d.x += d.z * 1.2
          if (d.y > h) {
            d.y = -d.len
            d.x = Math.random() * w
          }
          ctx.beginPath()
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - d.z * 1.2, d.y - d.len)
          ctx.stroke()
        }
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!raf) {
        draw()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [sky, reduced])

  if (sky === 'none' || reduced) return null
  return (
    <canvas
      ref={canvasRef}
      // Chỉ mask cho mây: mây phải ở dải trên để không lấn vào vùng card. Mưa và
      // tuyết thì cần rơi hết chiều cao mới đúng.
      style={
        sky === 'cloudy'
          ? {
              maskImage:
                'linear-gradient(to bottom, black 0%, transparent 55%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, black 0%, transparent 55%)',
            }
          : undefined
      }
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
