export interface Todo {
  id: string
  text: string
  done: boolean
  createdAt: number
}

export interface DailyForecast {
  date: string // ISO 'YYYY-MM-DD'
  code: number
  max: number
  min: number
}

export interface WeatherData {
  temperature: number
  weatherCode: number
  isDay: boolean
  city: string
  humidity: number
  wind: number
  daily: DailyForecast[]
  fetchedAt: number
}
