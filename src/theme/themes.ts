export type ThemeMode = 'light' | 'dark'

export interface Theme {
  id: string
  name: string
  mode: ThemeMode
  /** Gradient nền aurora (gán vào biến CSS --aurora-gradient). */
  gradient: string
  /** Màu đại diện hiển thị trong bộ chọn theme. */
  swatch: string
}

export const THEMES: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    gradient:
      'linear-gradient(130deg,#020617,#0f172a,#1e1b4b,#0f172a,#020617)',
    // Sáng hơn gradient nền thật: swatch #1e1b4b→#0f172a gần như đen tuyệt đối
    // nên ở dark mode nút chọn theme hiện ra như một vòng tròn RỖNG.
    swatch: 'linear-gradient(135deg,#6366f1,#1e1b4b)',
  },
  {
    id: 'daylight',
    name: 'Daylight',
    mode: 'light',
    gradient:
      'linear-gradient(130deg,#e0f2fe,#ede9fe,#fae8ff,#e0f2fe,#f0f9ff)',
    swatch: 'linear-gradient(135deg,#e0f2fe,#fae8ff)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    mode: 'dark',
    gradient:
      'linear-gradient(130deg,#1a0b2e,#3b0764,#7c2d12,#9a3412,#1a0b2e)',
    swatch: 'linear-gradient(135deg,#9a3412,#3b0764)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    mode: 'dark',
    gradient:
      'linear-gradient(130deg,#021526,#03346e,#0a4d68,#03346e,#021526)',
    swatch: 'linear-gradient(135deg,#0a4d68,#03346e)',
  },
  {
    id: 'forest',
    name: 'Forest',
    mode: 'dark',
    gradient:
      'linear-gradient(130deg,#021410,#052e16,#064e3b,#052e16,#021410)',
    swatch: 'linear-gradient(135deg,#064e3b,#052e16)',
  },
  {
    id: 'rose',
    name: 'Rosé',
    mode: 'light',
    gradient:
      'linear-gradient(130deg,#fff1f2,#ffe4e6,#fce7f3,#ffe4e6,#fff1f2)',
    swatch: 'linear-gradient(135deg,#fce7f3,#fecdd3)',
  },
  {
    id: 'sand',
    name: 'Sand',
    mode: 'light',
    gradient:
      'linear-gradient(130deg,#fefce8,#fef3c7,#fde68a,#fef3c7,#fefce8)',
    swatch: 'linear-gradient(135deg,#fde68a,#fef3c7)',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    mode: 'dark',
    gradient:
      'linear-gradient(130deg,#0a0a0a,#171717,#262626,#171717,#0a0a0a)',
    swatch: 'linear-gradient(135deg,#a3a3a3,#404040)',
  },
]

export const DEFAULT_THEME = 'midnight'
export const CUSTOM_ID = 'custom'

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

// Dựng theme từ 3 màu người dùng chọn trong bộ builder.
export function buildCustomTheme(
  mode: ThemeMode,
  colors: [string, string, string],
): Theme {
  const [a, b, c] = colors
  return {
    id: CUSTOM_ID,
    name: 'Custom',
    mode,
    gradient: `linear-gradient(130deg, ${a}, ${b}, ${c}, ${b}, ${a})`,
    swatch: `linear-gradient(135deg, ${b}, ${a})`,
  }
}
