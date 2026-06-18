import { useEffect, useRef, useState } from 'react'
import { cityById, GEO_ID } from '../lib/cities'
import type { WeatherData } from '../types'

const CACHE_PREFIX = 'dashboard.weather.'
const CACHE_TTL = 10 * 60 * 1000 // 10 phút
const REFRESH_INTERVAL = 60 * 60 * 1000 // tự cập nhật mỗi 1 giờ

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: WeatherData }

function readCache(key: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const data = JSON.parse(raw) as WeatherData
    if (Date.now() - data.fetchedAt < CACHE_TTL) return data
  } catch {
    /* ignore */
  }
  return null
}

async function fetchWeather(
  lat: number,
  lon: number,
  city: string,
): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day,relative_humidity_2m,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Không lấy được thời tiết')
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
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('no geolocation'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 10 * 60 * 1000,
    })
  })
}

// `selection` là id của thành phố trong CITIES, hoặc GEO_ID để dùng vị trí thực.
export function useWeather(selection: string) {
  const [state, setState] = useState<State>({ status: 'loading' })
  // Toạ độ đã giải xong cho selection hiện tại (tái dùng cho lần làm mới âm thầm,
  // tránh hỏi lại quyền định vị mỗi giờ).
  const locationRef = useRef<{ lat: number; lon: number; city: string } | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    locationRef.current = null

    // Giải toạ độ từ selection (chỉ làm 1 lần, sau đó lấy từ ref).
    const resolveLocation = async () => {
      if (locationRef.current) return locationRef.current
      let lat: number
      let lon: number
      let city: string

      if (selection === GEO_ID) {
        try {
          const pos = await getPosition()
          lat = pos.coords.latitude
          lon = pos.coords.longitude
          city = '' // rỗng -> widget hiển thị nhãn "Vị trí của bạn" theo ngôn ngữ
        } catch {
          // từ chối định vị -> mặc định TP.HCM
          const fallback = cityById('hcm')!
          lat = fallback.lat
          lon = fallback.lon
          city = fallback.name
        }
      } else {
        const c = cityById(selection) ?? cityById('hcm')!
        lat = c.lat
        lon = c.lon
        city = c.name
      }

      const loc = { lat, lon, city }
      locationRef.current = loc
      return loc
    }

    // silent = làm mới ngầm: không bật loading, lỗi thì giữ nguyên dữ liệu cũ.
    const run = async (silent: boolean) => {
      try {
        const { lat, lon, city } = await resolveLocation()
        const data = await fetchWeather(lat, lon, city)
        if (cancelled) return
        localStorage.setItem(CACHE_PREFIX + selection, JSON.stringify(data))
        setState({ status: 'ready', data })
      } catch (err) {
        if (cancelled || silent) return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Lỗi không xác định',
        })
      }
    }

    const cached = readCache(selection)
    if (cached) {
      setState({ status: 'ready', data: cached })
    } else {
      setState({ status: 'loading' })
      run(false)
    }

    // Tự cập nhật định kỳ mỗi giờ (âm thầm).
    const interval = setInterval(() => run(true), REFRESH_INTERVAL)

    // Quay lại tab -> làm mới âm thầm ngay lập tức.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      run(true)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [selection])

  return state
}
