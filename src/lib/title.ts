// Tiêu đề tab được hai nơi cùng ghi: App (đổi theo ngôn ngữ) và Pomodoro
// (đếm ngược). Giữ "tiêu đề gốc" ở một chỗ để bên đếm ngược biết phải trả về gì.

/** Tiêu đề tĩnh trong index.html — bản tiếng Việt, cũng là bản dành cho SEO. */
export const INITIAL_TITLE =
  typeof document !== 'undefined' ? document.title : ''

let base = INITIAL_TITLE
let overridden = false

export function setBaseTitle(value: string) {
  base = value
  if (!overridden) document.title = value
}

export function getBaseTitle() {
  return base
}

/** Pomodoro chiếm tiêu đề để hiện đếm ngược. */
export function overrideTitle(value: string) {
  overridden = true
  document.title = value
}

export function releaseTitle() {
  overridden = false
  document.title = base
}
