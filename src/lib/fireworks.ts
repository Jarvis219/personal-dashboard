// Pháo hoa nhẹ bằng canvas: gọi fireworks.burst(x, y) từ bất cứ đâu.
// Tự tạo 1 canvas full-screen (chỉ 1 lần), chạy rAF khi còn hạt rồi tự dừng.

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number // 1 -> 0
  decay: number
  color: string
  size: number
}

const COLORS = [
  '#f43f5e',
  '#f59e0b',
  '#22d3ee',
  '#a78bfa',
  '#34d399',
  '#fb7185',
  '#facc15',
]

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let sparks: Spark[] = []
let raf = 0
let dpr = 1

function ensureCanvas() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '50',
  })
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
}

function resize() {
  if (!canvas || !ctx) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function loop() {
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const s of sparks) {
    s.vy += 0.06 // trọng lực
    s.vx *= 0.99
    s.vy *= 0.99
    s.x += s.vx
    s.y += s.vy
    s.life -= s.decay

    ctx.globalAlpha = Math.max(s.life, 0)
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  sparks = sparks.filter((s) => s.life > 0)

  if (sparks.length > 0) {
    raf = requestAnimationFrame(loop)
  } else {
    cancelAnimationFrame(raf)
    raf = 0
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function burst(x: number, y: number, count = 44) {
  ensureCanvas()
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
    const speed = 2 + Math.random() * 4
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.012 + Math.random() * 0.012,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      size: 1.5 + Math.random() * 2,
    })
  }
  if (!raf) raf = requestAnimationFrame(loop)
}

export const fireworks = { burst }
