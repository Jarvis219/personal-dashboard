import { useEffect, useState } from 'react'
import { cityById, GEO_ID } from '../lib/cities'
import type { WeatherData } from '../types'

const CACHE_PREFIX = 'dashboard.weather.'
const CACHE_TTL = 10 * 60 * 1000 // 10 phút

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

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    const cached = readCache(selection)
    if (cached) {
      setState({ status: 'ready', data: cached })
      return
    }

    ;(async () => {
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

      try {
        const data = await fetchWeather(lat, lon, city)
        if (cancelled) return
        localStorage.setItem(CACHE_PREFIX + selection, JSON.stringify(data))
        setState({ status: 'ready', data })
      } catch (err) {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Lỗi không xác định',
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selection])

  return state
}
