import { useEffect } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useWeather } from '../hooks/useWeather'
import { GEO_ID } from '../lib/cities'
import { describeWeather } from '../lib/weatherCodes'
import { useWeatherStore } from '../store/useWeatherStore'
import { CitySelect } from './CitySelect'
import { GlassCard } from './GlassCard'

export function WeatherWidget() {
  const { t, lang, locale } = useI18n()
  const [city, setCity] = useLocalStorage<string>(
    'dashboard.weatherCity',
    GEO_ID,
  )
  const state = useWeather(city)
  const setFromWeather = useWeatherStore((s) => s.setFromWeather)

  // Cập nhật hiệu ứng nền theo thời tiết hiện tại.
  useEffect(() => {
    if (state.status === 'ready')
      setFromWeather(state.data.weatherCode, state.data.isDay)
  }, [state, setFromWeather])

  return (
    <GlassCard glow="hover:shadow-sky-500/20" className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-200/70">
          {t('weather.title')}
        </h2>
        <CitySelect value={city} onChange={setCity} />
      </div>

      {state.status === 'loading' && (
        <div className="flex flex-1 items-center justify-center py-6 text-slate-500 dark:text-slate-400">
          <span className="animate-pulse">{t('weather.loading')}</span>
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex flex-1 items-center justify-center py-6 text-rose-500 dark:text-rose-300/80">
          {t('weather.error')}
        </div>
      )}

      {state.status === 'ready' && (
        <div className="mt-2 flex flex-1 flex-col">
          <div className="flex items-center gap-4">
            <span className="text-6xl drop-shadow-lg">
              {describeWeather(state.data.weatherCode, lang).icon}
            </span>
            <div className="min-w-0">
              <div className="text-5xl font-bold text-slate-900 dark:text-white">
                {state.data.temperature}°
              </div>
              <div className="truncate text-base text-slate-600 dark:text-slate-300">
                {describeWeather(state.data.weatherCode, lang).label}
              </div>
              <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                📍 {state.data.city || t('weather.geoLabel')}
              </div>
            </div>
            <div className="ml-auto space-y-1 text-right text-sm text-slate-500 dark:text-slate-400">
              <div>💧 {state.data.humidity}%</div>
              <div>💨 {state.data.wind} km/h</div>
            </div>
          </div>

          {state.data.daily?.length > 0 && (
            <div className="mt-4 grid grid-cols-5 gap-1 border-t border-black/10 pt-3 text-center dark:border-white/10">
              {state.data.daily.map((d, i) => {
                const label =
                  i === 0
                    ? t('weather.today')
                    : new Intl.DateTimeFormat(locale, {
                        weekday: 'short',
                      }).format(new Date(d.date))
                return (
                  <div key={d.date} className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] capitalize text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                    <span className="text-xl">
                      {describeWeather(d.code, lang).icon}
                    </span>
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                      {d.max}°
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {d.min}°
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}
