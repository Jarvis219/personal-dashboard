import type { Lang } from '../i18n/translations'

interface Quote {
  vi: string
  en: string
  author: string
}

const QUOTES: Quote[] = [
  {
    vi: 'Cách tốt nhất để bắt đầu là ngừng nói và bắt tay vào làm.',
    en: 'The way to get started is to quit talking and begin doing.',
    author: 'Walt Disney',
  },
  {
    vi: 'Đừng đếm ngày tháng, hãy làm cho ngày tháng có giá trị.',
    en: "Don't count the days, make the days count.",
    author: 'Muhammad Ali',
  },
  {
    vi: 'Bí quyết để tiến lên là bắt đầu.',
    en: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
  },
  {
    vi: 'Kỷ luật là cây cầu nối giữa mục tiêu và thành tựu.',
    en: 'Discipline is the bridge between goals and accomplishment.',
    author: 'Jim Rohn',
  },
  {
    vi: 'Hành trình vạn dặm bắt đầu từ một bước chân.',
    en: 'A journey of a thousand miles begins with a single step.',
    author: 'Lão Tử',
  },
  {
    vi: 'Việc khó nhất là quyết định hành động, phần còn lại chỉ là kiên trì.',
    en: 'The most difficult thing is the decision to act; the rest is tenacity.',
    author: 'Amelia Earhart',
  },
  {
    vi: 'Chất lượng không phải là hành động, mà là một thói quen.',
    en: 'Quality is not an act, it is a habit.',
    author: 'Aristotle',
  },
  {
    vi: 'Tương lai phụ thuộc vào những gì bạn làm hôm nay.',
    en: 'The future depends on what you do today.',
    author: 'Mahatma Gandhi',
  },
  {
    vi: 'Bạn không cần phải hoàn hảo, chỉ cần tốt hơn hôm qua.',
    en: "You don't have to be perfect, just better than yesterday.",
    author: 'Khuyết danh',
  },
  {
    vi: 'Tập trung vào việc tiến bộ, đừng tìm kiếm sự hoàn hảo.',
    en: 'Focus on progress, not perfection.',
    author: 'Khuyết danh',
  },
  {
    vi: 'Cơ hội không tự đến, bạn phải tạo ra nó.',
    en: "Opportunities don't happen, you create them.",
    author: 'Chris Grosser',
  },
  {
    vi: 'Năng lượng và sự bền bỉ chinh phục mọi thứ.',
    en: 'Energy and persistence conquer all things.',
    author: 'Benjamin Franklin',
  },
]

// Chọn 1 quote ổn định theo ngày (cùng 1 quote suốt cả ngày).
export function quoteOfTheDay(lang: Lang, date: Date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86_400_000)
  const q = QUOTES[dayIndex % QUOTES.length]
  return { text: q[lang], author: q.author }
}
