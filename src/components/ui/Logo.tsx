import { useId } from 'react'

interface LogoProps {
  size?: number
  className?: string
  /** Omit the dark tile — used for large decorative watermarks. */
  bare?: boolean
}

/**
 * Pixelcraft mark: a 3D faceted prism cube on a deep-dark tile.
 * Cyan (#00E5FF) → Purple/Violet (#7C3AED) gradient, with an AI spark on the
 * top facet, a play motif on the right facet and brush strokes on the left.
 */
export default function Logo({ size = 40, className = '', bare = false }: LogoProps) {
  const uid = useId().replace(/:/g, '')
  const bg = `pc-bg-${uid}`
  const top = `pc-top-${uid}`
  const left = `pc-left-${uid}`
  const right = `pc-right-${uid}`
  const glow = `pc-glow-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Pixelcraft logo"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0B0C0E" />
          <stop offset="100%" stopColor="#090A0F" />
        </linearGradient>
        <linearGradient id={top} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id={left} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4C1D95" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id={right} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#00E5FF" />
        </linearGradient>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Deep-dark tile with pixel corners */}
      {!bare && (
        <>
          <rect x="1" y="1" width="46" height="46" rx="12" fill={`url(#${bg})`} stroke="#222530" strokeWidth="1" />
          <rect x="5" y="5" width="2" height="2" rx="0.5" fill="#00E5FF" opacity="0.7" />
          <rect x="41" y="5" width="2" height="2" rx="0.5" fill="#7C3AED" opacity="0.9" />
          <rect x="5" y="41" width="2" height="2" rx="0.5" fill="#7C3AED" opacity="0.7" />
          <rect x="41" y="41" width="2" height="2" rx="0.5" fill="#00E5FF" opacity="0.6" />
        </>
      )}

      {/* Faceted prism cube */}
      <g filter={`url(#${glow})`}>
        <polygon points="24,6 39,14.5 24,23 9,14.5" fill={`url(#${top})`} />
        <polygon points="9,14.5 24,23 24,41 9,32.5" fill={`url(#${left})`} />
        <polygon points="24,23 39,14.5 39,32.5 24,41" fill={`url(#${right})`} />
        <polygon points="24,6 39,14.5 24,17.5" fill="#FFFFFF" opacity="0.16" />
        <polygon points="24,23 39,14.5 39,20 24,28" fill="#00E5FF" opacity="0.12" />
      </g>

      {/* AI spark — top facet */}
      <path
        d="M24 11.5 l1.5 3.6 3.6 1.5 -3.6 1.5 -1.5 3.6 -1.5 -3.6 -3.6 -1.5 3.6 -1.5 z"
        fill="#FFFFFF"
        opacity="0.95"
      />
      {/* Play motif — right facet */}
      <path d="M27 27.5 L34.5 23.5 L34.5 32.5 Z" fill="#090A0F" opacity="0.7" />
      {/* Brush strokes — left facet */}
      <path d="M13 27.5 C15 25.5 17 25.5 19 27.5" stroke="#00E5FF" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M13 31 C15 29 17 29 19 31" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.9" />
    </svg>
  )
}
