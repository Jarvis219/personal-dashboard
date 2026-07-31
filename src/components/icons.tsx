import type { SVGProps } from 'react'

// Bộ icon monochrome (lucide-style) cho MỌI icon chức năng.
// Emoji chỉ còn dùng cho nội dung: icon thời tiết, avatar, cờ ngôn ngữ, nhãn widget.

type Props = SVGProps<SVGSVGElement>

function Svg({ className = 'h-4 w-4', ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    />
  )
}

export const SearchIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20.5 20.5-4.7-4.7" />
  </Svg>
)

export const FocusIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
  </Svg>
)

export const GridIcon = (p: Props) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Svg>
)

export const SettingsIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10.03 3.04V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.03a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
  </Svg>
)

export const TrashIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7h16M10 4h4M9 7v12M15 7v12" />
    <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </Svg>
)

export const XIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
)

export const CheckIcon = (p: Props) => (
  <Svg strokeWidth={2.5} {...p}>
    <path d="m5 13 4 4L19 7" />
  </Svg>
)

export const PlusIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const PencilIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
)

export const ChevronLeftIcon = (p: Props) => (
  <Svg {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
)

export const ChevronRightIcon = (p: Props) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
)

export const ChevronDownIcon = (p: Props) => (
  <Svg {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Svg>
)

export const ArrowUpIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)

export const ArrowDownIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
)

export const RefreshIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </Svg>
)

export const ResetIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M4 13a8 8 0 1 0 2.3-5.7" />
    <path d="M4 4v7h7" />
  </Svg>
)

export const DownloadIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4v11M8 11l4 4 4-4" />
    <path d="M5 19h14" />
  </Svg>
)

export const UploadIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M5 19h14" />
  </Svg>
)

export const GripIcon = (p: Props) => (
  <Svg strokeWidth={0} fill="currentColor" {...p}>
    <circle cx="9" cy="6" r="1.4" />
    <circle cx="15" cy="6" r="1.4" />
    <circle cx="9" cy="12" r="1.4" />
    <circle cx="15" cy="12" r="1.4" />
    <circle cx="9" cy="18" r="1.4" />
    <circle cx="15" cy="18" r="1.4" />
  </Svg>
)

export const PlayIcon = (p: Props) => (
  <Svg strokeWidth={0} fill="currentColor" {...p}>
    <path d="M8 5.6a1 1 0 0 1 1.52-.85l9 5.4a1 1 0 0 1 0 1.7l-9 5.4A1 1 0 0 1 8 16.4Z" />
  </Svg>
)

export const PauseIcon = (p: Props) => (
  <Svg strokeWidth={0} fill="currentColor" {...p}>
    <rect x="7" y="5" width="3.5" height="14" rx="1.2" />
    <rect x="13.5" y="5" width="3.5" height="14" rx="1.2" />
  </Svg>
)

export const SkipBackIcon = (p: Props) => (
  <Svg strokeWidth={0} fill="currentColor" {...p}>
    <path d="M18 6.3a1 1 0 0 0-1.52-.85l-8 5a1 1 0 0 0 0 1.7l8 5A1 1 0 0 0 18 16.3Z" />
    <rect x="5" y="5" width="2.2" height="14" rx="1.1" />
  </Svg>
)

export const SkipForwardIcon = (p: Props) => (
  <Svg strokeWidth={0} fill="currentColor" {...p}>
    <path d="M6 6.3a1 1 0 0 1 1.52-.85l8 5a1 1 0 0 1 0 1.7l-8 5A1 1 0 0 1 6 16.3Z" />
    <rect x="16.8" y="5" width="2.2" height="14" rx="1.1" />
  </Svg>
)

export const ShuffleIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="M4 4l5 5" />
  </Svg>
)

export const RepeatIcon = ({ one, ...p }: Props & { one?: boolean }) => (
  <Svg {...p}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    {one && <path d="M11 10h1v4" />}
  </Svg>
)

export const VolumeIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19Z" />
    <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
  </Svg>
)

/** "Sang phiên kế" — mũi tên vượt qua một vạch chặn, không nhầm với ⏭ của nhạc. */
export const SkipSessionIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M4 12h11" />
    <path d="m11 8 4 4-4 4" />
    <path d="M19 5v14" />
  </Svg>
)

export const BellIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 3h15Z" />
    <path d="M10 21h4" />
  </Svg>
)
