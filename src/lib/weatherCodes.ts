// Map WMO weather codes (Open-Meteo) -> emoji icon + localized description.
// Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
import type { Lang } from '../i18n/translations'

interface WeatherInfo {
  icon: string
  vi: string
  en: string
}

const CODES: Record<number, WeatherInfo> = {
  0: { icon: '☀️', vi: 'Trời quang', en: 'Clear sky' },
  1: { icon: '🌤️', vi: 'Ít mây', en: 'Mainly clear' },
  2: { icon: '⛅', vi: 'Có mây', en: 'Partly cloudy' },
  3: { icon: '☁️', vi: 'Nhiều mây', en: 'Overcast' },
  45: { icon: '🌫️', vi: 'Sương mù', en: 'Fog' },
  48: { icon: '🌫️', vi: 'Sương mù đóng băng', en: 'Rime fog' },
  51: { icon: '🌦️', vi: 'Mưa phùn nhẹ', en: 'Light drizzle' },
  53: { icon: '🌦️', vi: 'Mưa phùn', en: 'Drizzle' },
  55: { icon: '🌧️', vi: 'Mưa phùn dày', en: 'Dense drizzle' },
  56: { icon: '🌧️', vi: 'Mưa phùn lạnh', en: 'Freezing drizzle' },
  57: { icon: '🌧️', vi: 'Mưa phùn lạnh dày', en: 'Dense freezing drizzle' },
  61: { icon: '🌧️', vi: 'Mưa nhẹ', en: 'Light rain' },
  63: { icon: '🌧️', vi: 'Mưa vừa', en: 'Moderate rain' },
  65: { icon: '🌧️', vi: 'Mưa to', en: 'Heavy rain' },
  66: { icon: '🌧️', vi: 'Mưa lạnh', en: 'Freezing rain' },
  67: { icon: '🌧️', vi: 'Mưa lạnh to', en: 'Heavy freezing rain' },
  71: { icon: '🌨️', vi: 'Tuyết nhẹ', en: 'Light snow' },
  73: { icon: '🌨️', vi: 'Tuyết vừa', en: 'Moderate snow' },
  75: { icon: '❄️', vi: 'Tuyết dày', en: 'Heavy snow' },
  77: { icon: '❄️', vi: 'Hạt tuyết', en: 'Snow grains' },
  80: { icon: '🌦️', vi: 'Mưa rào nhẹ', en: 'Light showers' },
  81: { icon: '🌧️', vi: 'Mưa rào', en: 'Showers' },
  82: { icon: '⛈️', vi: 'Mưa rào lớn', en: 'Violent showers' },
  85: { icon: '🌨️', vi: 'Mưa tuyết nhẹ', en: 'Light snow showers' },
  86: { icon: '❄️', vi: 'Mưa tuyết dày', en: 'Heavy snow showers' },
  95: { icon: '⛈️', vi: 'Giông bão', en: 'Thunderstorm' },
  96: { icon: '⛈️', vi: 'Giông kèm mưa đá', en: 'Thunderstorm w/ hail' },
  99: { icon: '⛈️', vi: 'Giông kèm mưa đá lớn', en: 'Thunderstorm w/ heavy hail' },
}

const UNKNOWN: WeatherInfo = { icon: '🌡️', vi: 'Không rõ', en: 'Unknown' }

export function describeWeather(code: number, lang: Lang) {
  const info = CODES[code] ?? UNKNOWN
  return { icon: info.icon, label: info[lang] }
}
