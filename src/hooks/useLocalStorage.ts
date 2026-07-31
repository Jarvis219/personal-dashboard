import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * State React được lưu vào localStorage (dạng JSON).
 *
 * Nhiều component giờ dùng CÙNG một key (Todo + Lịch + bảng lệnh đều đọc
 * `dashboard.todos`), nên hook phải phát tín hiệu cho các instance khác trong
 * cùng tab. Nếu không, mỗi instance giữ một bản sao riêng: Lịch sẽ không thấy
 * hạn vừa đặt cho tới khi tải lại trang, và tệ hơn là một instance cũ có thể
 * ghi đè dữ liệu mới bằng bản sao đã lỗi thời của nó.
 */

type Listener = (raw: string | null) => void

const subscribers = new Map<string, Set<Listener>>()

function subscribe(key: string, fn: Listener) {
  let set = subscribers.get(key)
  if (!set) {
    set = new Set()
    subscribers.set(key, set)
  }
  set.add(fn)
  return () => {
    set.delete(fn)
    if (!set.size) subscribers.delete(key)
  }
}

function publish(key: string, raw: string, self: Listener) {
  subscribers.get(key)?.forEach((fn) => {
    if (fn !== self) fn(raw)
  })
}

function read<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : initial
  } catch {
    return initial
  }
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial))
  const valueRef = useRef(value)
  valueRef.current = value
  const initialRef = useRef(initial)
  initialRef.current = initial

  const apply = useCallback((next: T) => {
    valueRef.current = next
    setValue(next)
  }, [])

  // Thân listener đọc qua ref, nhưng IDENTITY của nó phải cố định để `publish`
  // loại được đúng instance đã phát ra thay đổi.
  const applyRef = useRef(apply)
  applyRef.current = apply
  const listenerRef = useRef<Listener>((raw) => {
    if (raw === null) return
    try {
      applyRef.current(JSON.parse(raw) as T)
    } catch {
      /* ignore */
    }
  })

  useEffect(() => subscribe(key, listenerRef.current), [key])

  // Ghi giá trị khởi tạo nếu key chưa tồn tại, để snapshot đồng bộ có đủ mặc định.
  useEffect(() => {
    if (localStorage.getItem(key) === null) {
      try {
        localStorage.setItem(key, JSON.stringify(valueRef.current))
      } catch {
        /* ignore quota */
      }
    }
  }, [key])

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (prev: T) => T)(valueRef.current)
          : next
      apply(resolved)
      try {
        const raw = JSON.stringify(resolved)
        localStorage.setItem(key, raw)
        publish(key, raw, listenerRef.current)
      } catch {
        // ignore quota / serialise errors
      }
    },
    [key, apply],
  )

  // Đọc lại key khi dữ liệu được áp từ cloud về (đồng bộ Supabase), hoặc khi
  // một tab khác cùng origin ghi vào localStorage.
  useEffect(() => {
    const reread = () => {
      const raw = localStorage.getItem(key)
      if (raw === null) return
      try {
        applyRef.current(JSON.parse(raw) as T)
      } catch {
        /* ignore */
      }
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) reread()
    }
    window.addEventListener('dashboard:external-change', reread)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('dashboard:external-change', reread)
      window.removeEventListener('storage', onStorage)
    }
  }, [key])

  const reset = useCallback(() => update(initialRef.current), [update])

  return [value, update, reset] as const
}
