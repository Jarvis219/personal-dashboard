import { useCallback, useEffect, useRef, useState } from 'react'
import { cityById, GEO_ID } from '../lib/cities'
import type { WeatherData } from '../types'

const CACHE_PREFIX = 'dashboard.weather.'
/** Sau mốc này thì dữ liệu được coi là cũ và nên làm mới — KHÔNG phải bị bỏ đi. */
const STALE_AFTER = 10 * 60 * 1000
const REFRESH_INTERVAL = 60 * 60 * 1000 // tự cập nhật mỗi 1 giờ

type State =
  | { status: 'loading' }
  | { status: 'error'; code: 'fetch_failed' }
  | { status: 'ready'; data: WeatherData; stale: boolean }

function readCache(key: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const data = JSON.parse(raw) as WeatherData
    return typeof data?.fetchedAt === 'number' ? data : null
  } catch {
    return null
  }
}

async function fetchWeather(
  lat: number,
  lon: number,
  city: string,
  geoDenied: boolean,
): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day,relative_humidity_2m,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('fetch_failed')
  const json = await res.json()
  const d = json.daily
  const daily = (d?.time ?? []).map((date: string, i: number) => ({
    date,
    code: d.weather_code[i],
    max: Math.round(d.temperature_2m_max[i]),
    min: Math.round(d.temperature_2m_min[i]),
  }))
  return {
    temperature: Math.round(json.current.temperature_2m),
    weatherCode: json.current.weather_code,
    isDay: json.current.is_day === 1,
    city,
    humidity: Math.round(json.current.relative_humidity_2m),
    wind: Math.round(json.current.wind_speed_10m),
    daily,
    fetchedAt: Date.now(),
    geoDenied,
  }
}

const GEO_TIMEOUT = 7000

/**
 * Lấy vị trí, có hạn chót CỨNG.
 *
 * Tuỳ chọn `timeout` của Geolocation API chỉ tính sau khi người dùng đã trả lời
 * prompt xin quyền — nếu họ cứ để prompt đó đấy thì KHÔNG callback nào được gọi
 * và widget treo mãi ở trạng thái "đang tải". Nên phải tự đặt hạn chót và fallback.
 */
function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('no geolocation'))
      return
    }
    let settled = false
    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
    }
    const timer = setTimeout(
      () => done(() => reject(new Error('geo timeout'))),
      GEO_TIMEOUT,
    )
    navigator.geolocation.getCurrentPosition(
      (pos) => done(() => resolve(pos)),
      (err) => done(() => reject(err)),
      { timeout: GEO_TIMEOUT, maximumAge: 10 * 60 * 1000 },
    )
  })
}

// `selection` là id của thành phố trong CITIES, hoặc GEO_ID để dùng vị trí thực.
export function useWeather(selection: string) {
  const [state, setState] = useState<State>({ status: 'loading' })
  // Toạ độ đã giải xong cho selection hiện tại (tái dùng cho lần làm mới âm thầm,
  // tránh hỏi lại quyền định vị mỗi giờ).
  const locationRef = useRef<{
    lat: number
    lon: number
    city: string
    geoDenied: boolean
  } | null>(null)
  const fetchedAtRef = useRef(0)
  const inFlightRef = useRef(false)
  const runRef = useRef<(silent: boolean) => void>(() => {})

  useEffect(() => {
    let cancelled = false
    locationRef.current = null
    fetchedAtRef.current = 0

    // Giải toạ độ từ selection (chỉ làm 1 lần, sau đó lấy từ ref).
    const resolveLocation = async () => {
      if (locationRef.current) return locationRef.current
      let lat: number
      let lon: number
      let city: string
      let geoDenied = false

      if (selection === GEO_ID) {
        try {
          const pos = await getPosition()
          lat = pos.coords.latitude
          lon = pos.coords.longitude
          city = '' // rỗng -> widget hiển thị nhãn "Vị trí của bạn" theo ngôn ngữ
        } catch {
          // Từ chối định vị -> mặc định TP.HCM, nhưng phải NÓI RA: trước đây chip
          // vẫn ghi "Vị trí của tôi" trong khi thân widget ghi TP.HCM.
          const fallback = cityById('hcm')!
          lat = fallback.lat
          lon = fallback.lon
          city = fallback.name
          geoDenied = true
        }
      } else {
        const c = cityById(selection) ?? cityById('hcm')!
        lat = c.lat
        lon = c.lon
        city = c.name
      }

      const loc = { lat, lon, city, geoDenied }
      locationRef.current = loc
      return loc
    }

    // silent = làm mới ngầm: không bật loading, lỗi thì giữ nguyên dữ liệu cũ.
    const run = async (silent: boolean) => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      try {
        const { lat, lon, city, geoDenied } = await resolveLocation()
        const data = await fetchWeather(lat, lon, city, geoDenied)
        if (cancelled) return
        localStorage.setItem(CACHE_PREFIX + selection, JSON.stringify(data))
        fetchedAtRef.current = data.fetchedAt
        setState({ status: 'ready', data, stale: false })
      } catch {
        if (cancelled || silent) return
        setState({ status: 'error', code: 'fetch_failed' })
      } finally {
        inFlightRef.current = false
      }
    }
    runRef.current = run

    const cached = readCache(selection)
    if (cached) {
      const age = Date.now() - cached.fetchedAt
      fetchedAtRef.current = cached.fetchedAt
      // Luôn hiện dữ liệu đã có, kể cả quá 10 phút, chỉ đánh dấu là cũ. Bản trước
      // bỏ hẳn cache quá hạn rồi fetch -> offline là hiện lỗi dù đang có dữ liệu.
      setState({ status: 'ready', data: cached, stale: age > STALE_AFTER })
      if (age > STALE_AFTER) run(true)
    } else {
      setState({ status: 'loading' })
      run(false)
    }

    // Tự cập nhật định kỳ mỗi giờ (âm thầm).
    const interval = setInterval(() => run(true), REFRESH_INTERVAL)

    // Quay lại tab -> chỉ làm mới nếu dữ liệu đã cũ. Bản trước gọi API mỗi lần
    // đổi tab, nên chuyển qua lại 50 lần là 50 request.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - fetchedAtRef.current < STALE_AFTER) return
      run(true)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      // Phải nhả cờ in-flight: nó là ref sống qua các lần chạy effect, còn
      // `cancelled` thì chỉ thuộc closure này. Nếu không nhả, StrictMode
      // double-mount (hoặc đổi thành phố nhanh) sẽ khoá cứng: lần chạy trước bị
      // cancel nên không set state, lần sau bị guard chặn nên không chạy.
      inFlightRef.current = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [selection])

  const refresh = useCallback(() => {
    locationRef.current = null // cho phép thử xin quyền định vị lại
    runRef.current(false)
  }, [])

  return { state, refresh }
}
