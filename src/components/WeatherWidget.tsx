import { useEffect } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useWeather } from '../hooks/useWeather'
import { GEO_ID } from '../lib/cities'
import { describeWeather } from '../lib/weatherCodes'
import { useWeatherStore } from '../store/useWeatherStore'
import { CitySelect } from './CitySelect'
import { GlassCard } from './GlassCard'
import { RefreshIcon } from './icons'

export function WeatherWidget() {
  const { t, lang, locale } = useI18n()
  const [city, setCity] = useLocalStorage<string>(
    'dashboard.weatherCity',
    GEO_ID,
  )
  const { state, refresh } = useWeather(city)
  const setFromWeather = useWeatherStore((s) => s.setFromWeather)

  // Cập nhật hiệu ứng nền theo thời tiết hiện tại.
  useEffect(() => {
    if (state.status === 'ready')
      setFromWeather(state.data.weatherCode, state.data.isDay)
  }, [state, setFromWeather])

  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="card-title">{t('weather.title')}</h2>
        <div className="flex items-center gap-1">
          <CitySelect value={city} onChange={setCity} />
          <button
            onClick={refresh}
            aria-label={t('weather.refresh')}
            title={t('weather.refresh')}
            className="icon-btn h-8 w-8"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="empty-state">
          <span className="text-sm muted motion-safe:animate-pulse">
            {t('weather.loading')}
          </span>
        </div>
      )}

      {state.status === 'error' && (
        <div className="empty-state" role="alert">
          <p className="text-sm text-rose-600 dark:text-rose-300">
            {t('weather.error')}
          </p>
          <button onClick={refresh} className="btn-ghost mt-1 text-xs">
            {t('common.retry')}
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <div className="mt-2 flex flex-1 flex-col">
          <div className="flex items-center gap-4">
            <span className="text-5xl" aria-hidden="true">
              {describeWeather(state.data.weatherCode, lang).icon}
            </span>
            <div className="min-w-0">
              <div className="text-5xl font-bold tabular-nums text-slate-900 dark:text-white">
                {state.data.temperature}°
              </div>
              <div className="truncate text-base muted">
                {describeWeather(state.data.weatherCode, lang).label}
              </div>
              <div className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
                📍 {state.data.city || t('weather.geoLabel')}
              </div>
            </div>
            <div className="ml-auto space-y-1 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
              <div>💧 {state.data.humidity}%</div>
              <div>💨 {state.data.wind} km/h</div>
            </div>
          </div>

          {/* Đã fallback vì không có quyền định vị -> nói rõ, đừng để chip ghi
              "Vị trí của tôi" mà thân widget lại ghi thành phố khác. */}
          {state.data.geoDenied && city === GEO_ID && (
            <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
              {t('weather.geoDenied', { city: state.data.city })}
            </p>
          )}

          {state.data.daily?.length > 0 && (
            <div className="divider-t mt-4 grid grid-cols-5 gap-1 pt-3 text-center">
              {state.data.daily.map((d, i) => {
                const label =
                  i === 0
                    ? t('weather.today')
                    : new Intl.DateTimeFormat(locale, {
                        weekday: 'short',
                        // API trả ngày theo giờ địa phương của thành phố; parse
                        // 'YYYY-MM-DD' trần thì Date coi là UTC nên ở múi giờ âm
                        // sẽ hiện lệch một ngày.
                      }).format(new Date(d.date + 'T12:00:00'))
                return (
                  <div key={d.date} className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] capitalize text-slate-600 dark:text-slate-400">
                      {label}
                    </span>
                    <span className="text-xl" aria-hidden="true">
                      {describeWeather(d.code, lang).icon}
                    </span>
                    <span className="text-[11px] font-medium tabular-nums text-slate-800 dark:text-slate-200">
                      {d.max}°
                    </span>
                    <span className="text-[11px] tabular-nums text-slate-600 dark:text-slate-400">
                      {d.min}°
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
            {t('weather.updatedAt', {
              time: timeFmt.format(new Date(state.data.fetchedAt)),
            })}
            {state.stale ? ' · ⚠️' : ''}
          </p>
        </div>
      )}
    </GlassCard>
  )
}
