// Trích videoId từ nhiều dạng link YouTube + lấy tiêu đề qua oEmbed.

export function parseYouTubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s // đã là ID

  try {
    const url = new URL(s)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1)
      return /^[\w-]{11}$/.test(id) ? id : null
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
    ) {
      if (url.pathname === '/watch') {
        const v = url.searchParams.get('v')
        return v && /^[\w-]{11}$/.test(v) ? v : null
      }
      const m = url.pathname.match(/^\/(?:shorts|embed|v|live)\/([\w-]{11})/)
      if (m) return m[1]
    }
  } catch {
    // không phải URL hợp lệ
  }
  return null
}

/**
 * Lấy tiêu đề video (oEmbed có CORS). Trả về `null` khi thất bại.
 *
 * Bản trước trả về chính `videoId` khi lỗi, mà UI lại coi "title === videoId"
 * là dấu hiệu ĐANG TẢI — nên một lần fetch lỗi làm item treo ở nhãn
 * "đang lấy tiêu đề…" vĩnh viễn, kể cả sau khi reload.
 */
export async function fetchYouTubeTitle(
  videoId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    )
    if (res.ok) {
      const json = (await res.json()) as { title?: string }
      if (json.title) return json.title
    }
  } catch {
    /* ignore */
  }
  return null
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
