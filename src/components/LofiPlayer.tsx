import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer'
import { type AmbientChannel, ambient } from '../lib/ambient'
import {
  alive,
  ensureStamps,
  newId,
  purgeTombstones,
  restore,
  softDelete,
} from '../lib/syncable'
import { fetchYouTubeTitle, formatTime, parseYouTubeId } from '../lib/youtube'
import { toastUndo } from '../store/useToastStore'
import type { YtTrack } from '../types'
import { GlassCard } from './GlassCard'
import {
  GripIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  RepeatIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  TrashIcon,
  VolumeIcon,
} from './icons'

type Mode = 'radio' | 'youtube'
type LoopMode = 'off' | 'all' | 'one'
const LOOP_NEXT: Record<LoopMode, LoopMode> = {
  off: 'all',
  all: 'one',
  one: 'off',
}

interface Station {
  id: string
  name: string
  descKey: string
  url: string
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
    descKey: 'lofi.descGroove',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
  },
  {
    id: 'dronezone',
    name: 'Drone Zone',
    descKey: 'lofi.descDrone',
    url: 'https://ice1.somafm.com/dronezone-128-mp3',
  },
  {
    id: 'lush',
    name: 'Lush',
    descKey: 'lofi.descLush',
    url: 'https://ice1.somafm.com/lush-128-mp3',
  },
  {
    id: 'fluid',
    name: 'Fluid',
    descKey: 'lofi.descFluid',
    url: 'https://ice1.somafm.com/fluid-128-mp3',
  },
]

/** Chuẩn hoá playlist của bản cũ (`{id: videoId, title: string}`). */
function normalizeTracks(list: YtTrack[]): YtTrack[] {
  return list.map((tk) => {
    const videoId = tk.videoId ?? tk.id
    const title = tk.title === videoId ? null : (tk.title ?? null)
    return tk.videoId === videoId && tk.title === title
      ? tk
      : { ...tk, videoId, title }
  })
}

function TrackRow({
  track,
  index,
  total,
  isCurrent,
  isPlaying,
  onPlay,
  onRemove,
  onMove,
  onRetryTitle,
}: {
  track: YtTrack
  index: number
  total: number
  isCurrent: boolean
  isPlaying: boolean
  onPlay: () => void
  onRemove: () => void
  onMove: (delta: number) => void
  onRetryTitle: () => void
}) {
  const { t } = useI18n()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id })

  return (
    <li
      ref={setNodeRef}
      data-track-id={track.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        'group flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-sm transition ' +
        (isDragging ? 'relative z-10 opacity-70 ' : '') +
        (isCurrent
          ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
          : 'text-slate-700 hover:bg-black/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]')
      }
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={t('lofi.drag')}
        title={t('lofi.drag')}
        className="reveal icon-btn h-6 w-5 cursor-grab touch-none active:cursor-grabbing"
      >
        <GripIcon className="h-3.5 w-3.5" />
      </button>
      <img
        src={`https://i.ytimg.com/vi/${track.videoId}/default.jpg`}
        alt=""
        loading="lazy"
        className="h-7 w-10 flex-none rounded object-cover"
      />
      <button
        onClick={onPlay}
        className="min-w-0 flex-1 truncate text-left"
        title={track.title ?? track.videoId}
      >
        {isCurrent && isPlaying ? '♫ ' : `${index + 1}. `}
        {/* Lấy tiêu đề thất bại thì hiện chính videoId, KHÔNG treo mãi ở
            "đang lấy tiêu đề…" như bản trước. */}
        {track.title ?? track.videoId}
      </button>
      {track.title === null && (
        <button
          onClick={onRetryTitle}
          aria-label={t('lofi.retryTitle')}
          title={t('lofi.titleFailed')}
          className="reveal icon-btn h-6 w-6"
        >
          <RefreshIcon className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Sắp xếp bằng nút — cần cho bàn phím và cho cảm ứng khi kéo khó. */}
      <button
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label={t('lofi.moveUp')}
        className="reveal icon-btn h-6 w-5 disabled:opacity-20"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path d="m6 14 6-6 6 6" />
        </svg>
      </button>
      <button
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        aria-label={t('lofi.moveDown')}
        className="reveal icon-btn h-6 w-5 disabled:opacity-20"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path d="m6 10 6 6 6-6" />
        </svg>
      </button>
      <button
        onClick={onRemove}
        aria-label={t('lofi.remove')}
        className="reveal icon-btn h-6 w-6 hover:text-rose-500"
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}

export function LofiPlayer() {
  const { t } = useI18n()
  const [mode, setMode] = useLocalStorage<Mode>('dashboard.lofiMode', 'radio')
  const [volume, setVolume] = useLocalStorage<number>('dashboard.lofiVolume', 0.6)
  const [ambientVol, setAmbientVol] = useLocalStorage<
    Record<AmbientChannel, number>
  >('dashboard.ambient', { rain: 0, waves: 0, fire: 0, wind: 0 })
  const [ambientBlocked, setAmbientBlocked] = useState(false)

  // Khôi phục âm lượng nền đã lưu ngay khi mount. AudioContext có thể vẫn ở
  // trạng thái suspended (chưa có tương tác) -> hiện nút bật lại thay vì im lặng.
  useEffect(() => {
    const wanted = Object.values(ambientVol).some((v) => v > 0)
    if (!wanted) return
    ambient.applyAll(ambientVol)
    const id = window.setTimeout(() => setAmbientBlocked(ambient.suspended), 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeAmbient = (id: AmbientChannel, v: number) => {
    ambient.setVolume(id, v)
    setAmbientVol((prev) => ({ ...prev, [id]: v }))
    setAmbientBlocked(false)
  }

  const resumeAmbient = () => {
    ambient.applyAll(ambientVol)
    setAmbientBlocked(false)
  }

  // ----- Radio (SomaFM) -----
  const audioRef = useRef<HTMLAudioElement>(null)
  const [stationId, setStationId] = useLocalStorage<string>(
    'dashboard.lofiStation',
    STATIONS[0].id,
  )
  const [radioPlaying, setRadioPlaying] = useState(false)
  const [radioLoading, setRadioLoading] = useState(false)
  const [radioError, setRadioError] = useState(false)
  const station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0]

  // ----- YouTube -----
  const [stored, setStored] = useLocalStorage<YtTrack[]>(
    'dashboard.ytPlaylist',
    [],
  )
  const [currentId, setCurrentId] = useState<string | null>(null)
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
  useEffect(() => {
    setStored((prev) => {
      const next = normalizeTracks(ensureStamps(purgeTombstones(prev)))
      return next.length === prev.length &&
        next.every((item, i) => item === prev[i])
        ? prev
        : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playlist = useMemo(() => alive(stored), [stored])
  const playlistRef = useRef(playlist)
  playlistRef.current = playlist
  const currentIdRef = useRef(currentId)
  currentIdRef.current = currentId
  const loopRef = useRef(loopMode)
  loopRef.current = loopMode
  const shuffleRef = useRef(shuffle)
  shuffleRef.current = shuffle

  const currentIndex = currentId
    ? playlist.findIndex((tk) => tk.id === currentId)
    : -1

  // Chọn bài kế: ngẫu nhiên nếu bật shuffle, ngược lại tuần tự (lặp vòng).
  const pickNext = (): YtTrack | null => {
    const list = playlistRef.current
    if (!list.length) return null
    const at = list.findIndex((tk) => tk.id === currentIdRef.current)
    if (shuffleRef.current && list.length > 1) {
      let i = at
      while (i === at) i = Math.floor(Math.random() * list.length)
      return list[i]
    }
    return list[(at + 1) % list.length]
  }

  const playTrack = (track: YtTrack) => {
    setCurrentId(track.id)
    ytApi.load(track.videoId)
  }

  // ⏭ thủ công: luôn sang bài kế.
  const advance = () => {
    const next = pickNext()
    if (next) playTrack(next)
  }

  // Khi hết bài: tuỳ chế độ lặp.
  const handleEnded = () => {
    const list = playlistRef.current
    if (!list.length) return
    const at = list.findIndex((tk) => tk.id === currentIdRef.current)
    if (loopRef.current === 'one' && at >= 0) {
      ytApi.load(list[at].videoId) // phát lại bài hiện tại
      return
    }
    // off (không shuffle) + đang ở bài cuối -> dừng
    if (!shuffleRef.current && at >= list.length - 1 && loopRef.current !== 'all')
      return
    advance()
  }
  const { containerRef, ready, playing, currentTime, duration, api: ytApi } =
    useYouTubePlayer(handleEnded)

  // Đồng bộ âm lượng cho cả 2 nguồn. `ytApi` ổn định giữa các render nên effect
  // này chỉ chạy khi âm lượng thật sự đổi.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    ytApi.setVolume(volume)
  }, [volume, ready, ytApi])

  // Cuộn danh sách tới bài đang phát mỗi khi đổi bài.
  useEffect(() => {
    if (!currentId) return
    document
      .querySelector(`[data-track-id="${currentId}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [currentId])

  // Đổi chế độ -> tạm dừng nguồn còn lại.
  useEffect(() => {
    if (mode === 'youtube') {
      audioRef.current?.pause()
      setRadioPlaying(false)
    } else {
      ytApi.pause()
    }
  }, [mode, ytApi])

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

  const pickStation = async (id: string) => {
    const wasPlaying = radioPlaying
    setStationId(id)
    setRadioError(false)
    // Đang phát thì đổi đài phải phát tiếp — bản trước bắt bấm play lại.
    await new Promise((r) => requestAnimationFrame(r))
    const audio = audioRef.current
    if (!audio) return
    audio.load()
    if (!wasPlaying) {
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

  // ---- YouTube handlers ----
  const fillTitle = async (rowId: string, videoId: string) => {
    const title = await fetchYouTubeTitle(videoId)
    setStored((prev) =>
      prev.map((tk) =>
        tk.id === rowId ? { ...tk, title, updatedAt: Date.now() } : tk,
      ),
    )
  }

  const addLink = async () => {
    const videoId = parseYouTubeId(link)
    if (!videoId) {
      setLinkError(true)
      return
    }
    setLinkError(false)
    setLink('')
    const rowId = newId()
    setStored((prev) => [
      ...prev,
      { id: rowId, videoId, title: null, updatedAt: Date.now() },
    ])
    await fillTitle(rowId, videoId)
  }

  const togglePlay = () => {
    if (currentIndex < 0) {
      if (playlist.length) playTrack(playlist[0])
      return
    }
    if (playing) ytApi.pause()
    else ytApi.play()
  }

  const playPrev = () => {
    if (!playlist.length) return
    const at = currentIndex < 0 ? 0 : currentIndex
    playTrack(playlist[(at - 1 + playlist.length) % playlist.length])
  }

  const removeTrack = (track: YtTrack) => {
    // Xoá bài ĐANG phát thì phải dừng hẳn; bản trước chỉ bỏ khỏi danh sách nên
    // nhạc vẫn chạy tiếp trong khi tiêu đề hiện "—".
    if (track.id === currentId) {
      ytApi.stop()
      setCurrentId(null)
    }
    setStored((prev) => softDelete(prev, track.id))
    toastUndo(t('lofi.deleted'), t('common.undo'), () =>
      setStored((prev) => restore(prev, track.id)),
    )
  }

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= playlist.length || from === to) return
    const reordered = arrayMove(playlist, from, to)
    setStored((prev) => [...reordered, ...prev.filter((tk) => tk.deletedAt)])
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    reorder(
      playlist.findIndex((tk) => tk.id === active.id),
      playlist.findIndex((tk) => tk.id === over.id),
    )
  }

  const nowPlaying = currentIndex >= 0 ? playlist[currentIndex] : null
  const loopLabel = t(
    loopMode === 'off'
      ? 'lofi.loopOff'
      : loopMode === 'all'
        ? 'lofi.loopAll'
        : 'lofi.loopOne',
  )

  return (
    <GlassCard className="flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="card-title">{t('lofi.title')}</h2>
        <div className="flex gap-1 rounded-full bg-black/5 p-0.5 text-xs dark:bg-white/5">
          {(['radio', 'youtube'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={
                'rounded-full px-3 py-1 font-medium transition ' +
                (mode === m
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
              }
            >
              {m === 'radio' ? t('lofi.tabDefault') : t('lofi.tabYoutube')}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- Radio panel ----------------
          Giới hạn bề rộng: card này rộng 2–3 cột nên nếu để tràn, 4 nút chọn đài
          bị kéo thành pill 250px và slider âm lượng dài gần cả card. */}
      <div className={mode === 'radio' ? 'mt-3 max-w-xl' : 'hidden'}>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleRadio}
            className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
            aria-label={radioPlaying ? t('lofi.pause') : t('lofi.play')}
          >
            {radioLoading ? (
              <span className="text-lg">…</span>
            ) : radioPlaying ? (
              <PauseIcon className="h-6 w-6" />
            ) : (
              <PlayIcon className="h-6 w-6 translate-x-px" />
            )}
          </button>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-900 dark:text-white">
              {station.name}
            </div>
            <div className="truncate text-sm muted">
              {radioPlaying ? '♫ ' : ''}
              {t(station.descKey)}
            </div>
          </div>
        </div>

        <div
          className="mt-3 grid max-w-lg grid-cols-2 gap-1.5 sm:grid-cols-4"
          role="group"
          aria-label={t('lofi.station')}
        >
          {STATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => pickStation(s.id)}
              aria-pressed={s.id === stationId}
              className={
                'rounded-lg px-2 py-1.5 text-xs font-medium transition ' +
                (s.id === stationId
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                  : 'bg-black/[0.05] text-slate-700 hover:bg-black/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10')
              }
            >
              {s.name}
            </button>
          ))}
        </div>

        {radioError && (
          <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-300">
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
            <div ref={containerRef} className="h-full w-full" />
          </div>

          <div className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {nowPlaying ? (nowPlaying.title ?? nowPlaying.videoId) : '—'}
          </div>

          {/* Thanh tua */}
          <div className="mt-2 flex items-center gap-2 text-xs tabular-nums text-slate-600 dark:text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => ytApi.seek(+e.target.value)}
              disabled={currentIndex < 0 || !duration}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 accent-indigo-500 disabled:opacity-40 dark:bg-white/15"
              aria-label={t('lofi.seek')}
            />
            <span>{formatTime(duration)}</span>
          </div>

          {/* Điều khiển */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setShuffle((s) => !s)}
              aria-pressed={shuffle}
              aria-label={t('lofi.shuffle')}
              title={t('lofi.shuffle')}
              className={
                'icon-btn ' + (shuffle ? 'text-indigo-500 dark:text-indigo-300' : '')
              }
            >
              <ShuffleIcon className="h-4 w-4" />
            </button>
            <button
              onClick={playPrev}
              disabled={!playlist.length}
              aria-label={t('lofi.prev')}
              className="icon-btn disabled:opacity-30"
            >
              <SkipBackIcon className="h-5 w-5" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!playlist.length}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:opacity-40"
              aria-label={playing ? t('lofi.pause') : t('lofi.play')}
            >
              {playing ? (
                <PauseIcon className="h-5 w-5" />
              ) : (
                <PlayIcon className="h-5 w-5 translate-x-px" />
              )}
            </button>
            <button
              onClick={advance}
              disabled={!playlist.length}
              aria-label={t('lofi.next')}
              className="icon-btn disabled:opacity-30"
            >
              <SkipForwardIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setLoopMode(LOOP_NEXT[loopMode])}
              aria-label={loopLabel}
              title={loopLabel}
              className={
                'icon-btn ' +
                (loopMode !== 'off' ? 'text-indigo-500 dark:text-indigo-300' : '')
              }
            >
              <RepeatIcon one={loopMode === 'one'} className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cột phải: thêm link + playlist */}
        <div className="mt-3 flex flex-col md:mt-0">
          <div className="flex gap-2">
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value)
                setLinkError(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && addLink()}
              placeholder={t('lofi.ytPlaceholder')}
              className="field flex-1"
            />
            <button onClick={addLink} className="btn-primary">
              {t('lofi.add')}
            </button>
          </div>
          {linkError && (
            <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-300">
              {t('lofi.invalidLink')}
            </p>
          )}

          {playlist.length === 0 ? (
            <div className="empty-state">
              <p className="text-sm muted">{t('lofi.emptyList')}</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={playlist.map((tk) => tk.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="scroll-thin mt-3 max-h-56 flex-1 space-y-0.5 overflow-y-auto pr-1 md:max-h-72">
                  {playlist.map((tk, i) => (
                    <TrackRow
                      key={tk.id}
                      track={tk}
                      index={i}
                      total={playlist.length}
                      isCurrent={tk.id === currentId}
                      isPlaying={playing}
                      onPlay={() => playTrack(tk)}
                      onRemove={() => removeTrack(tk)}
                      onMove={(delta) => reorder(i, i + delta)}
                      onRetryTitle={() => fillTitle(tk.id, tk.videoId)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Âm thanh nền (trộn chồng lên nhạc) */}
      <div className="divider-t mt-3 max-w-2xl pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t('lofi.ambient')}
          </p>
          {ambientBlocked && (
            <button onClick={resumeAmbient} className="btn-ghost px-2 py-1 text-xs">
              {t('lofi.enableAmbient')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {AMBIENT.map(({ id, icon }) => (
            <label key={id} className="flex items-center gap-2">
              <span
                className={
                  'text-base transition ' +
                  (ambientVol[id] > 0 ? '' : 'opacity-40 grayscale')
                }
                aria-hidden="true"
              >
                {icon}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={ambientVol[id] ?? 0}
                onChange={(e) => changeAmbient(id, +e.target.value)}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 accent-indigo-500 dark:bg-white/15"
                aria-label={t(`lofi.${id}`)}
                title={t(`lofi.${id}`)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Âm lượng dùng chung */}
      <div className="divider-t mt-3 flex max-w-xs items-center gap-2 pt-3">
        <VolumeIcon className="h-4 w-4 flex-none text-slate-600 dark:text-slate-400" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(+e.target.value)}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 accent-indigo-500 dark:bg-white/15"
          aria-label={t('lofi.volume')}
        />
      </div>

      <audio ref={audioRef} src={station.url} preload="none" />
    </GlassCard>
  )
}
