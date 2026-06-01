import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Tailwind shadow-color class for the neon glow accent on hover. */
  glow?: string
}

export function GlassCard({
  children,
  className = '',
  glow = 'hover:shadow-indigo-500/20',
}: GlassCardProps) {
  return (
    <div
      className={
        'glass h-full rounded-2xl p-6 shadow-xl shadow-black/10 transition-all duration-300 ' +
        'hover:border-indigo-400/30 hover:-translate-y-0.5 dark:shadow-black/30 dark:hover:border-white/20 ' +
        glow +
        ' ' +
        className
      }
    >
      {children}
    </div>
  )
}
