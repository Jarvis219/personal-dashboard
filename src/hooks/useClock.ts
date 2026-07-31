import { useEffect, useState } from 'react'

// Tick once per second, aligned roughly to the wall-clock second.
export function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return now
}

export type DayPeriod = 'night' | 'morning' | 'noon' | 'afternoon' | 'evening'

export function periodForHour(hour: number): DayPeriod {
  // 0–4h gọi là "buổi sáng" thì sai: 1 giờ đêm không ai chào buổi sáng.
  if (hour < 5) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 14) return 'noon'
  if (hour < 18) return 'afternoon'
  return 'evening'
}
