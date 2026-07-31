import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

// Vỏ card dùng chung. Không còn prop `glow` riêng cho từng widget: 10 hue accent
// khác nhau (có 3 cặp gần trùng nhau) làm bảng màu rối mà không mang thông tin gì
// — màu giờ chỉ dành cho dữ liệu định lượng bên trong card.
export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={
        'glass h-full rounded-2xl p-5 transition-[transform,box-shadow] duration-300 sm:p-6 ' +
        'hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-500/10 ' +
        className
      }
    >
      {children}
    </div>
  )
}
