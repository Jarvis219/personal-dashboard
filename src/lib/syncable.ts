import type { Syncable } from '../types'

// Tiện ích dùng chung cho các danh sách được đồng bộ (todo, bookmark, habit, playlist).
//
// Nguyên tắc: XOÁ = đặt `deletedAt`, không splice khỏi mảng. Nếu xoá cứng thì
// khi merge với cloud/thiết bị khác, `unionById` sẽ thấy item vẫn còn ở phía kia
// và đưa nó sống lại. Tombstone được dọn sau TOMBSTONE_TTL.

const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 ngày

let counter = 0
/** Id đủ duy nhất cho localStorage (kèm random để 2 thiết bị không trùng). */
export const newId = () =>
  `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`

/** Item còn sống (chưa bị tombstone). */
export const alive = <T extends Syncable>(items: T[]): T[] =>
  items.filter((i) => !i.deletedAt)

/** Đóng dấu thời gian sửa đổi — bắt buộc để merge chọn được bản mới. */
export const touch = <T extends Syncable>(item: T): T => ({
  ...item,
  updatedAt: Date.now(),
})

/** Đánh dấu xoá thay vì bỏ khỏi mảng. */
export const softDelete = <T extends Syncable>(items: T[], id: string): T[] =>
  items.map((i) =>
    i.id === id ? { ...i, deletedAt: Date.now(), updatedAt: Date.now() } : i,
  )

/** Bỏ đánh dấu xoá (dùng cho Hoàn tác). */
export const restore = <T extends Syncable>(items: T[], id: string): T[] =>
  items.map((i) =>
    i.id === id
      ? { ...i, deletedAt: undefined, updatedAt: Date.now() }
      : i,
  )

/** Dọn tombstone quá hạn — gọi khi mount để mảng không phình mãi. */
export const purgeTombstones = <T extends Syncable>(items: T[]): T[] => {
  const cutoff = Date.now() - TOMBSTONE_TTL
  return items.filter((i) => !i.deletedAt || i.deletedAt > cutoff)
}

/**
 * Gán `updatedAt` cho item của bản cũ (chưa có trường này) để merge xếp chúng là
 * cũ nhất. Kiểm tra bằng `typeof`, không phải truthiness — `updatedAt: 0` là
 * falsy nên bản trước tạo lại object mới ở mỗi lần mount.
 */
export const ensureStamps = <T extends Syncable>(items: T[], stamp = 1): T[] =>
  items.map((i) =>
    typeof i.updatedAt === 'number' ? i : { ...i, updatedAt: stamp },
  )
