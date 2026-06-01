// Tiện ích quản lý dữ liệu dashboard trong localStorage.

const PREFIX = 'dashboard.'

// Xóa toàn bộ dữ liệu dashboard rồi tải lại trang.
export function resetDashboard() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => localStorage.removeItem(key))
  location.reload()
}

// Xuất tất cả key dashboard.* ra file JSON tải về.
export function exportDashboard() {
  const data: Record<string, unknown> = {}
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) as string)
      } catch {
        data[key] = localStorage.getItem(key)
      }
    })
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'dashboard-backup.json'
  a.click()
  URL.revokeObjectURL(url)
}

// Nạp dữ liệu từ file JSON đã xuất, ghi đè rồi tải lại.
export function importDashboard(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as Record<
          string,
          unknown
        >
        Object.entries(data).forEach(([key, value]) => {
          if (!key.startsWith(PREFIX)) return
          localStorage.setItem(
            key,
            typeof value === 'string' ? value : JSON.stringify(value),
          )
        })
        location.reload()
        resolve()
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
