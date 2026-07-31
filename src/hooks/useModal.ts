import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

interface Options {
  /** Cho phép Esc đóng. Đặt false cho hộp thoại bắt buộc chọn (MergeDialog). */
  closeOnEscape?: boolean
  /** Tự focus phần tử focus được đầu tiên. Tắt trên thiết bị cảm ứng để bàn phím ảo không bật. */
  autoFocus?: boolean
}

/**
 * Nền tảng a11y cho modal: khoá focus bên trong, Esc đóng, chặn cuộn trang,
 * và trả focus về phần tử đã mở modal khi đóng.
 *
 * Dùng kèm `role="dialog" aria-modal="true" aria-labelledby=...` trên phần tử
 * nhận `ref` trả về.
 */
export function useModal<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
  { closeOnEscape = true, autoFocus = true }: Options = {},
) {
  const ref = useRef<T>(null)
  const triggerRef = useRef<Element | null>(null)

  // Ghi nhớ phần tử đang focus trước khi mở, trả lại khi đóng.
  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement
    return () => {
      const el = triggerRef.current
      if (el instanceof HTMLElement && document.contains(el)) el.focus()
    }
  }, [open])

  // Chặn cuộn trang phía sau.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Focus đầu tiên (bỏ qua trên cảm ứng để không bật bàn phím ảo che modal).
  useEffect(() => {
    if (!open || !autoFocus) return
    const canHover = window.matchMedia('(hover: hover)').matches
    if (!canHover) return
    const id = window.setTimeout(() => {
      const node = ref.current
      if (!node) return
      const first = node.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? node).focus()
    }, 0)
    return () => clearTimeout(id)
  }, [open, autoFocus])

  // Esc để đóng + Tab quay vòng trong modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const node = ref.current
      if (!node) return
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!node.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose, closeOnEscape])

  return ref
}
