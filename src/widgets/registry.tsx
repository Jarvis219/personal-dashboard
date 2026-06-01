import type { ComponentType } from 'react'
import { BookmarksWidget } from '../components/BookmarksWidget'
import { CalendarWidget } from '../components/CalendarWidget'
import { ClockWidget } from '../components/ClockWidget'
import { HabitWidget } from '../components/HabitWidget'
import { LofiPlayer } from '../components/LofiPlayer'
import { NotesWidget } from '../components/NotesWidget'
import { PomodoroWidget } from '../components/PomodoroWidget'
import { StatsWidget } from '../components/StatsWidget'
import { TodoWidget } from '../components/TodoWidget'
import { WeatherWidget } from '../components/WeatherWidget'

export const WIDGETS: Record<string, ComponentType> = {
  clock: ClockWidget,
  weather: WeatherWidget,
  todo: TodoWidget,
  pomodoro: PomodoroWidget,
  calendar: CalendarWidget,
  lofi: LofiPlayer,
  notes: NotesWidget,
  habits: HabitWidget,
  bookmarks: BookmarksWidget,
  stats: StatsWidget,
}

export type WidgetId = keyof typeof WIDGETS

// Widget chiếm 2 cột trên desktop (1 cột trên mobile).
export const WIDE_WIDGETS = new Set<WidgetId>(['lofi'])

// Thứ tự mặc định + dùng làm nguồn danh sách đầy đủ.
export const WIDGET_IDS: WidgetId[] = [
  'clock',
  'weather',
  'todo',
  'pomodoro',
  'calendar',
  'lofi',
  'notes',
  'habits',
  'bookmarks',
  'stats',
]

// Emoji nhãn hiển thị trong menu ẩn/hiện. Tên hiển thị lấy từ i18n key `widget.<id>`.
export const WIDGET_ICON: Record<string, string> = {
  clock: '🕐',
  weather: '🌤️',
  todo: '✅',
  pomodoro: '🍅',
  calendar: '📅',
  lofi: '🎵',
  notes: '📝',
  habits: '🔥',
  bookmarks: '🔖',
  stats: '📊',
}
