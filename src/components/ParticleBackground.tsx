import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import type { ThemeMode } from '../theme/themes'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

const PARTICLE_COUNT = 60
const LINK_DISTANCE = 130
const SPEED = 0.25

// Lightweight canvas "constellation" background — particles drift slowly and
// connect with faint neon lines when close. ~no deps, cleans up on unmount.
export function ParticleBackground({ mode }: { mode: ThemeMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return // tôn trọng prefers-reduced-motion: không chạy rAF nào
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let raf = 0

    const seed = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
      }))
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Darker indigo on light theme so particles stay visible.
      const isDark = modeRef.current === 'dark'
      const lineRGB = isDark ? '129, 140, 248' : '79, 70, 229'
      const dotColor = isDark
        ? 'rgba(165, 180, 252, 0.7)'
        : 'rgba(79, 70, 229, 0.5)'

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
      }

      // links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DISTANCE) {
            const alpha = (1 - dist / LINK_DISTANCE) * 0.25
            ctx.strokeStyle = `rgba(${lineRGB}, ${alpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // dots
      for (const p of particles) {
        ctx.fillStyle = dotColor
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    // Tab ẩn -> dừng hẳn vòng vẽ. Trước đây canvas này (60 hạt + tính khoảng
    // cách O(n²)) chạy 100% thời gian, kể cả khi không ai xem, ăn pin laptop.
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
  }, [reduced])

  if (reduced) return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
