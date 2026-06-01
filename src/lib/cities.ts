export interface City {
  id: string
  name: string
  lat: number
  lon: number
}

// 'geo' = dùng vị trí thực của trình duyệt.
export const GEO_ID = 'geo'

export const CITIES: City[] = [
  { id: 'hcm', name: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
  { id: 'hanoi', name: 'Hà Nội', lat: 21.0278, lon: 105.8342 },
  { id: 'danang', name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022 },
  { id: 'cantho', name: 'Cần Thơ', lat: 10.0452, lon: 105.7469 },
  { id: 'tokyo', name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { id: 'singapore', name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { id: 'seoul', name: 'Seoul', lat: 37.5665, lon: 126.978 },
  { id: 'newyork', name: 'New York', lat: 40.7128, lon: -74.006 },
  { id: 'london', name: 'London', lat: 51.5074, lon: -0.1278 },
  { id: 'paris', name: 'Paris', lat: 48.8566, lon: 2.3522 },
]

export function cityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id)
}
