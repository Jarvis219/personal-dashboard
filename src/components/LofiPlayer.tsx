import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer'
import { type AmbientChannel, ambient } from '../lib/ambient'
import {
  fetchYouTubeTitle,
  formatTime,
  parseYouTubeId,
} from '../lib/youtube'
import { GlassCard } from './GlassCard'

type Mode = 'radio' | 'youtube'
type LoopMode = 'off' | 'all' | 'one'
const LOOP_NEXT: Record<LoopMode, LoopMode> = {
  off: 'all',
  all: 'one',
  one: 'off',
}

// Icon shuffle monochrome (lucide-style).
function ShuffleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="M4 4l5 5" />
    </svg>
  )
}

// Icon loop monochrome (lucide-style "repeat") — ăn theo màu chữ, không có nền emoji.
function LoopIcon({ one }: { one: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      {one && <path d="M11 10h1v4" />}
    </svg>
  )
}

interface Station {
  id: string
  name: string
  desc: string
  url: string
}

interface YtTrack {
  id: string
  title: string
}

const AMBIENT: { id: AmbientChannel; icon: string }[] = [
  { id: 'rain', icon: '🌧️' },
  { id: 'waves', icon: '🌊' },
  { id: 'fire', icon: '🔥' },
  { id: 'wind', icon: '💨' },
]

// Đài radio công cộng miễn phí của SomaFM (không cần API key).
const STATIONS: Station[] = [
  {
    id: 'groovesalad',
    name: 'Groove Salad',
    desc: 'Ambient / downtempo chill',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
  },
  {
    id: 'dronezone',
    name: 'Drone Zone',
    desc: 'Atmospheric space music',
    url: 'https://ice1.somafm.com/dronezone-128-mp3',
  },
  {
    id: 'lush',
    name: 'Lush',
    desc: 'Sensuous vocals, chill beats',
    url: 'https://ice1.somafm.com/lush-128-mp3',
  },
  {
    id: 'fluid',
    name: 'Fluid',
    desc: 'Lo-fi hip-hop / future soul',
    url: 'https://ice1.somafm.com/fluid-128-mp3',
  },
]

export function LofiPlayer() {
  const { t } = useI18n()
  const [mode, setMode] = useLocalStorage<Mode>('dashboard.lofiMode', 'radio')
  const [volume, setVolume] = useState(0.6)
  const [ambientVol, setAmbientVol] = useLocalStorage<
    Record<AmbientChannel, number>
  >('dashboard.ambient', { rain: 0, waves: 0, fire: 0, wind: 0 })

  const changeAmbient = (id: AmbientChannel, v: number) => {
    ambient.setVolume(id, v)
    setAmbientVol((prev) => ({ ...prev, [id]: v }))
  }

  // ----- Radio (SomaFM) -----
  const audioRef = useRef<HTMLAudioElement>(null)
  const [stationId, setStationId] = useState(STATIONS[0].id)
  const [radioPlaying, setRadioPlaying] = useState(false)
  const [radioLoading, setRadioLoading] = useState(false)
  const [radioError, setRadioError] = useState(false)
  const station = STATIONS.find((s) => s.id === stationId)!

  // ----- YouTube -----
  const [playlist, setPlaylist] = useLocalStorage<YtTrack[]>(
    'dashboard.ytPlaylist',
    [],
  )
  const [current, setCurrent] = useState(-1)
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState(false)
  const [loopMode, setLoopMode] = useLocalStorage<LoopMode>(
    'dashboard.lofiLoop',
    'off',
  )
  const [shuffle, setShuffle] = useLocalStorage<boolean>(
    'dashboard.lofiShuffle',
    false,
  )
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const playlistRef = useRef(playlist)
  playlistRef.current = playlist
  const currentRef = useRef(current)
  currentRef.current = current
  const loopRef = useRef(loopMode)
  loopRef.current = loopMode
  const shuffleRef = useRef(shuffle)
  shuffleRef.current = shuffle

  // Chọn bài kế: ngẫu nhiên nếu bật shuffle, ngược lại tuần tự (lặp vòng).
  const pickNext = () => {
    const list = playlistRef.current
    if (!list.length) return -1
    if (shuffleRef.current && list.length > 1) {
      let i = currentRef.current
      while (i === currentRef.current) i = Math.floor(Math.random() * list.length)
      return i
    }
    return (currentRef.current + 1) % list.length
  }

  // ⏭ thủ công: luôn sang bài kế.
  const advance = () => {
    const i = pickNext()
    if (i < 0) return
    setCurrent(i)
    yt.load(playlistRef.current[i].id)
  }

  // Khi hết bài: tuỳ chế độ lặp.
  const handleEnded = () => {
    const list = playlistRef.current
    const cur = currentRef.current
    if (!list.length) return
    if (loopRef.current === 'one' && cur >= 0) {
      yt.load(list[cur].id) // phát lại bài hiện tại
      return
    }
    // off (không shuffle) + đang ở bài cuối -> dừng
    if (!shuffleRef.current && cur >= list.length - 1 && loopRef.current !== 'all')
      return
    advance()
  }
  const yt = useYouTubePlayer(handleEnded)

  // Đồng bộ âm lượng cho cả 2 nguồn.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    yt.setVolume(volume)
  }, [volume, yt.ready, yt])

  // Đổi chế độ -> tạm dừng nguồn còn lại.
  useEffect(() => {
    if (mode === 'youtube') {
      audioRef.current?.pause()
      setRadioPlaying(false)
    } else {
      yt.pause()
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Radio handlers ----
  const toggleRadio = async () => {
    const audio = audioRef.current
    if (!audio) return
    setRadioError(false)
    if (radioPlaying) {
      audio.pause()
      setRadioPlaying(false)
      return
    }
    try {
      setRadioLoading(true)
      await audio.play()
      setRadioPlaying(true)
    } catch {
      setRadioError(true)
      setRadioPlaying(false)
    } finally {
      setRadioLoading(false)
    }
  }

  const pickStation = (id: string) => {
    setStationId(id)
    setRadioPlaying(false)
    requestAnimationFrame(() => audioRef.current?.load())
  }

  // ---- YouTube handlers ----
  const addLink = async () => {
    const id = parseYouTubeId(link)
    if (!id) {
      setLinkError(true)
      return
    }
    setLinkError(false)
    setLink('')
    setPlaylist((prev) => [...prev, { id, title: id }])
    const title = await fetchYouTubeTitle(id)
    setPlaylist((prev) =>
      prev.map((tk) => (tk.id === id && tk.title === id ? { ...tk, title } : tk)),
    )
  }

  const playIndex = (i: number) => {
    setCurrent(i)
    yt.load(playlist[i].id)
  }

  const togglePlay = () => {
    if (current < 0) {
      if (playlist.length) playIndex(0)
      return
    }
    if (yt.playing) yt.pause()
    else yt.play()
  }

  const playPrev = () => {
    if (!playlist.length) return
    playIndex((current - 1 + playlist.length) % playlist.length)
  }

  const removeTrack = (i: number) => {
    setPlaylist((prev) => prev.filter((_, idx) => idx !== i))
    if (i === current) setCurrent(-1)
    else if (i < current) setCurrent((c) => c - 1)
  }

  // Kéo-thả: chuyển bài từ vị trí dragIndex tới vị trí `to`.
  const dropOn = (to: number) => {
    if (dragIndex === null || dragIndex === to) {
      setDragIndex(null)
      return
    }
    const curTrack = current >= 0 ? playlist[current] : null
    const next = [...playlist]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(to, 0, moved)
    setPlaylist(next)
    if (curTrack) setCurrent(next.indexOf(curTrack)) // giữ đúng bài đang phát
    setDragIndex(null)
  }

  const nowPlaying = current >= 0 ? playlist[current] : null

  return (
    <GlassCard glow="hover:shadow-amber-500/20" className="flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-200/70">
          {t('lofi.title')}
        </h2>
        <div className="flex gap-1 rounded-full bg-black/5 p-0.5 text-xs dark:bg-white/5">
          {(['radio', 'youtube'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                'rounded-full px-3 py-1 font-medium transition ' +
                (mode === m
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white')
              }
            >
              {m === 'radio' ? t('lofi.tabDefault') : t('lofi.tabYoutube')}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- Radio panel ---------------- */}
      <div className={mode === 'radio' ? 'mt-3' : 'hidden'}>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleRadio}
            className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-amber-500/90 text-2xl text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-500"
            aria-label={radioPlaying ? t('lofi.pause') : t('lofi.play')}
          >
            {radioLoading ? '…' : radioPlaying ? '⏸' : '▶'}
          </button>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-900 dark:text-white">
              {station.name}
            </div>
            <div className="truncate text-sm text-slate-500 dark:text-slate-400">
              {radioPlaying ? '♫ ' : ''}
              {station.desc}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {STATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => pickStation(s.id)}
              className={
                'rounded-lg px-2 py-1.5 text-xs font-medium transition ' +
                (s.id === stationId
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200'
                  : 'bg-black/5 text-slate-600 hover:bg-black/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10')
              }
            >
              {s.name}
            </button>
          ))}
        </div>

        {radioError && (
          <p className="mt-2 text-xs text-rose-500 dark:text-rose-300/80">
            {t('lofi.error')}
          </p>
        )}
      </div>

      {/* ---------------- YouTube panel ---------------- */}
      <div
        className={
          mode === 'youtube'
            ? 'mt-3 md:grid md:grid-cols-2 md:items-start md:gap-5'
            : 'hidden'
        }
      >
        {/* Cột trái: video + điều khiển */}
        <div>
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/40">
            <div ref={yt.containerRef} className="h-full w-full" />
          </div>

        <div className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
          {nowPlaying ? nowPlaying.title : '—'}
        </div>

        {/* Thanh tua */}
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">{formatTime(yt.currentTime)}</span>
          <input
            type="range"
            min={0}
            max={yt.duration || 0}
            step={1}
            value={Math.min(yt.currentTime, yt.duration || 0)}
            onChange={(e) => yt.seek(+e.target.value)}
            disabled={current < 0 || !yt.duration}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 accent-amber-500 disabled:opacity-40 dark:bg-white/15"
            aria-label={t('lofi.title')}
          />
          <span className="tabular-nums">{formatTime(yt.duration)}</span>
        </div>

        {/* Điều khiển */}
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => setShuffle((s) => !s)}
            className={
              'mr-1 flex h-9 w-9 items-center justify-center rounded-full transition ' +
              (shuffle
                ? 'text-amber-500'
                : 'text-slate-400 opacity-50 hover:opacity-80 dark:text-slate-500')
            }
            aria-label={t('lofi.shuffle')}
            title={t('lofi.shuffle')}
          >
            <ShuffleIcon />
          </button>
          <button
            onClick={playPrev}
            disabled={!playlist.length}
            className="text-2xl text-slate-600 transition hover:text-amber-500 disabled:opacity-30 dark:text-slate-300"
            aria-label={t('lofi.prev')}
          >
            ⏮
          </button>
          <button
            onClick={togglePlay}
            disabled={!playlist.length}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/90 text-xl text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-500 disabled:opacity-40"
            aria-label={yt.playing ? t('lofi.pause') : t('lofi.play')}
          >
            {yt.playing ? '⏸' : '▶'}
          </button>
          <button
            onClick={advance}
            disabled={!playlist.length}
            className="text-2xl text-slate-600 transition hover:text-amber-500 disabled:opacity-30 dark:text-slate-300"
            aria-label={t('lofi.next')}
          >
            ⏭
          </button>
          <button
            onClick={() => setLoopMode(LOOP_NEXT[loopMode])}
            className={
              'ml-1 flex h-9 w-9 items-center justify-center rounded-full transition ' +
              (loopMode === 'off'
                ? 'text-slate-400 opacity-50 hover:opacity-80 dark:text-slate-500'
                : 'text-amber-500')
            }
            aria-label={t(`lofi.loop${loopMode === 'off' ? 'Off' : loopMode === 'all' ? 'All' : 'One'}`)}
            title={t(`lofi.loop${loopMode === 'off' ? 'Off' : loopMode === 'all' ? 'All' : 'One'}`)}
          >
            <LoopIcon one={loopMode === 'one'} />
          </button>
          </div>
        </div>

        {/* Cột phải: thêm link + playlist */}
        <div className="mt-3 flex flex-col md:mt-0">
        {/* Thêm link */}
        <div className="flex gap-2">
          <input
            value={link}
            onChange={(e) => {
              setLink(e.target.value)
              setLinkError(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && addLink()}
            placeholder={t('lofi.ytPlaceholder')}
            className="min-w-0 flex-1 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-amber-400/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button
            onClick={addLink}
            className="rounded-lg bg-amber-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
          >
            {t('lofi.add')}
          </button>
        </div>
        {linkError && (
          <p className="mt-1 text-xs text-rose-500 dark:text-rose-300/80">
            {t('lofi.invalidLink')}
          </p>
        )}

        {/* Playlist */}
        <ul className="scroll-thin mt-3 max-h-40 flex-1 space-y-1 overflow-y-auto pr-1 md:max-h-72">
          {playlist.length === 0 && (
            <li className="py-4 text-center text-xs text-slate-500">
              {t('lofi.emptyList')}
            </li>
          )}
          {playlist.map((tk, i) => (
            <li
              key={tk.id + i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dropOn(i)}
              onDragEnd={() => setDragIndex(null)}
              className={
                'group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition ' +
                (dragIndex === i ? 'opacity-40 ' : '') +
                (i === current
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
                  : 'text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5')
              }
            >
              <span
                className="flex-none cursor-grab select-none text-slate-400 active:cursor-grabbing dark:text-slate-500"
                title={t('lofi.drag')}
                aria-hidden="true"
              >
                ⠿
              </span>
              <img
                src={`https://i.ytimg.com/vi/${tk.id}/default.jpg`}
                alt=""
                loading="lazy"
                className="h-7 w-10 flex-none rounded object-cover"
              />
              <button
                onClick={() => playIndex(i)}
                className="min-w-0 flex-1 truncate text-left"
                title={tk.title}
              >
                {i === current && yt.playing ? '♫ ' : `${i + 1}. `}
                {tk.title === tk.id ? t('lofi.loadingTitle') : tk.title}
              </button>
              <button
                onClick={() => removeTrack(i)}
                className="flex-none text-slate-400 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                aria-label={t('lofi.remove')}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        </div>
      </div>

      {/* Âm thanh nền (trộn chồng lên nhạc) */}
      <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('lofi.ambient')}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {AMBIENT.map(({ id, icon }) => (
            <label key={id} className="flex items-center gap-2">
              <span
                className={
                  'text-base transition ' +
                  (ambientVol[id] > 0 ? '' : 'opacity-40 grayscale')
                }
              >
                {icon}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={ambientVol[id]}
                onChange={(e) => changeAmbient(id, +e.target.value)}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 accent-amber-500 dark:bg-white/15"
                aria-label={t(`lofi.${id}`)}
                title={t(`lofi.${id}`)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Âm lượng dùng chung */}
      <div className="mt-3 flex items-center gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <span className="text-sm">🔈</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(+e.target.value)}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 accent-amber-500 dark:bg-white/15"
          aria-label={t('lofi.volume')}
        />
      </div>

      <audio ref={audioRef} src={station.url} preload="none" />
    </GlassCard>
  )
}
