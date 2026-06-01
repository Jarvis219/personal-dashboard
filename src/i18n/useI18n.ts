import { useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type Lang, translations } from './translations'

export const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
]

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
}

// Ngôn ngữ hiện tại — lưu localStorage (cùng prefix dashboard.* để reset cuốn theo).
export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'vi',
      setLang: (lang) => set({ lang }),
      toggle: () => set((s) => ({ lang: s.lang === 'vi' ? 'en' : 'vi' })),
    }),
    { name: 'dashboard.lang' },
  ),
)

type Params = Record<string, string | number>

export function useI18n() {
  const lang = useLangStore((s) => s.lang)

  const t = useCallback(
    (key: string, params?: Params) => {
      const tpl = translations[lang][key] ?? translations.vi[key] ?? key
      return params
        ? tpl.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
        : tpl
    },
    [lang],
  )

  const locale = lang === 'vi' ? 'vi-VN' : 'en-US'
  return { t, lang, locale }
}
