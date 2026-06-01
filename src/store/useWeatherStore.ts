import { create } from 'zustand'

export type Sky =
  | 'none'
  | 'clear-day'
  | 'clear-night'
  | 'cloudy'
  | 'rain'
  | 'snow'

interface WeatherFxState {
  sky: Sky
  setFromWeather: (code: number, isDay: boolean) => void
}

function skyOf(code: number, isDay: boolean): Sky {
  // Tuyết
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  // Mưa / mưa rào / giông
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95)
    return 'rain'
  // Âm u: nhiều mây / sương mù
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy'
  // Quang đãng / ít mây
  if (code === 0 || code === 1) return isDay ? 'clear-day' : 'clear-night'
  return 'none'
}

// Bầu trời hiện tại dùng cho hiệu ứng nền (không lưu localStorage).
export const useWeatherStore = create<WeatherFxState>((set) => ({
  sky: 'none',
  setFromWeather: (code, isDay) => set({ sky: skyOf(code, isDay) }),
}))
