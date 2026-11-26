import Logo from './Logo'

/**
 * Decorative background for the home and authentication pages.
 * Entirely non-interactive (pointer-events-none + aria-hidden) and sits at z-0,
 * so page content only needs `relative z-10` to stay above it.
 */

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 48 48">
  <polygon points="24,6 39,14.5 24,23 9,14.5" fill="#00E5FF"/>
  <polygon points="9,14.5 24,23 24,41 9,32.5" fill="#7C3AED"/>
  <polygon points="24,23 39,14.5 39,32.5 24,41" fill="#00E5FF" opacity="0.55"/>
</svg>`

const MARK_URL = `url("data:image/svg+xml,${encodeURIComponent(MARK)}")`

interface LogoBackdropProps {
  size?: number
  className?: string
}

export default function LogoBackdrop({ size = 620, className = '' }: LogoBackdropProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 z-0 select-none overflow-hidden ${className}`}>
      {/* Soft cyan / violet bloom */}
      <div
        className="absolute -left-40 -top-40 h-[38rem] w-[38rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.14), transparent 68%)', filter: 'blur(90px)' }}
      />
      <div
        className="absolute -bottom-52 -right-40 h-[42rem] w-[42rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.22), transparent 68%)', filter: 'blur(90px)' }}
      />

      {/* Repeating faceted marks */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{ backgroundImage: MARK_URL, backgroundSize: '150px 150px', backgroundPosition: 'center' }}
      />

      {/* Single large watermark */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
        style={{ filter: 'drop-shadow(0 0 40px rgba(0,229,255,0.25))' }}
      >
        <Logo size={size} bare />
      </div>
    </div>
  )
}
