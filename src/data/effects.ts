/**
 * Real, data-driven effect presets for the Pro Studio.
 *
 * Every preset stores a CSS filter/transform recipe for the live preview and
 * an FFmpeg filter recipe for export. Effects live on individual clips in
 * `clip.params.effects`, so stacking, order, enable/disable and intensity are
 * preserved in the saved project.
 */

export interface ClipEffect {
  /** Unique instance id, so the same preset can be applied twice. */
  id: string
  /** Stable preset id from EFFECT_CATEGORIES. */
  effectId: string
  name: string
  category: string
  intensity: number
  enabled: boolean
  /** Optional per-instance overrides, e.g. custom duration. */
  duration?: number
}

export interface EffectContext {
  /** Seconds into the clip. */
  t: number
  /** Clip length in seconds. */
  duration: number
}

export interface StudioEffect {
  id: string
  name: string
  category: string
  icon: string
  description: string
  defaultIntensity: number
  accent: string
  tags: string[]
  css: (intensity: number, ctx: EffectContext) => string
  transform?: (intensity: number, ctx: EffectContext) => string
  ffmpeg?: (intensity: number, duration: number) => string[]
}

const lerp = (a: number, b: number, i: number) => a + (b - a) * i
const clamp01 = (i: number) => Math.max(0, Math.min(1, i))

const base = (
  id: string,
  name: string,
  category: string,
  icon: string,
  accent: string,
  css: StudioEffect['css'],
  extra: Partial<StudioEffect> = {},
): StudioEffect => ({
  id, name, category, icon, accent,
  description: `${name} effect`,
  defaultIntensity: 0.6,
  tags: [],
  css,
  ...extra,
})

export const EFFECT_CATEGORIES: Array<{ name: string; icon: string; effects: StudioEffect[] }> = [
  {
    name: 'Hits', icon: 'Zap', effects: [
      base('hit-flash', 'Hit Flash', 'Hits', 'Zap', '#facc15', (i) => `brightness(${lerp(1, 2.6, i)})`),
      base('hit-impact', 'Impact Zoom', 'Hits', 'Zap', '#f97316', (i) => `contrast(${lerp(1, 1.7, i)})`, { transform: (i) => `scale(${lerp(1, 1.18, i)})` }),
      base('hit-shock', 'Shock Ring', 'Hits', 'Sparkles', '#fb7185', (i) => `drop-shadow(0 0 ${Math.round(i * 22)}px ${i > 0.5 ? '#f43f5e' : '#facc15'})`),
    ],
  },
  {
    name: 'B.Duck', icon: 'Sparkles', effects: [
      base('duck-bounce', 'Bounce Duck', 'B.Duck', 'Sparkles', '#fde047', (i) => `saturate(${lerp(1, 1.8, i)})`, { transform: (i, c) => `translateY(${Math.sin(c.t * 8) * i * 18}px)` }),
      base('duck-pop', 'Rubber Pop', 'B.Duck', 'Sparkles', '#fb923c', (i) => `contrast(${lerp(1, 1.5, i)})`, { transform: (i, c) => `scale(${1 + Math.max(0, Math.sin(c.t * 6)) * i * 0.12})` }),
      base('duck-walk', 'Duck Walk', 'B.Duck', 'Sparkles', '#facc15', (i, c) => `hue-rotate(${Math.sin(c.t * 5) * i * 20}deg)`),
    ],
  },
  {
    name: 'Intro & Outro', icon: 'Film', effects: [
      base('intro-fade', 'Fade Intro', 'Intro & Outro', 'Film', '#38bdf8', (i, c) => `opacity(${Math.min(1, c.t / Math.max(0.1, i * 1.5))})`, { ffmpeg: (i) => [`fade=t=in:st=0:d=${(i * 1.5).toFixed(2)}`] }),
      base('intro-slide', 'Slide Intro', 'Intro & Outro', 'Film', '#00e5ff', (_i, c) => `opacity(${Math.min(1, c.t / 0.6)})`, { transform: (i, c) => `translateX(${Math.max(0, 1 - c.t / 0.8) * -i * 160}px)` }),
      base('outro-zoom', 'Zoom Outro', 'Intro & Outro', 'Film', '#a78bfa', (i, c) => `brightness(${1 - Math.max(0, (c.t - (c.duration - 1)) / 1) * i * 0.8})`, { transform: (i, c) => `scale(${1 + Math.max(0, (c.t - (c.duration - 1)) / 1) * i * 0.2})` }),
    ],
  },
  {
    name: 'Party', icon: 'PartyPopper', effects: [
      base('party-confetti', 'Confetti Burst', 'Party', 'PartyPopper', '#f472b6', (i) => `saturate(${lerp(1, 2.1, i)}) hue-rotate(${i * 12}deg)`),
      base('party-neon', 'Neon Party', 'Party', 'PartyPopper', '#22d3ee', (i) => `saturate(${lerp(1, 2.4, i)}) drop-shadow(0 0 ${Math.round(i * 14)}px #22d3ee)`),
      base('party-sparkle', 'Sparkle Shower', 'Party', 'Sparkles', '#fde68a', (i) => `brightness(${lerp(1, 1.35, i)}) contrast(${lerp(1, 1.2, i)})`),
    ],
  },
  {
    name: 'Motion', icon: 'Move', effects: [
      base('motion-push', 'Slow Push', 'Motion', 'Move', '#60a5fa', (i) => `contrast(${lerp(1, 1.12, i)})`, { transform: (i, c) => `scale(${1 + Math.min(1, c.t / Math.max(c.duration, 1)) * i * 0.16})` }),
      base('motion-pan', 'Pan Left', 'Motion', 'Move', '#34d399', (i) => `brightness(${lerp(1, 1.08, i)})`, { transform: (i, c) => `translateX(${Math.min(1, c.t / Math.max(c.duration, 1)) * -i * 90}px)` }),
      base('motion-whip', 'Whip Pan', 'Motion', 'Move', '#818cf8', (i) => `blur(${i * 3}px)`, { transform: (i, c) => `translateX(${Math.sin(c.t * 10) * i * 70}px)` }),
    ],
  },
  {
    name: '3D', icon: 'Box', effects: [
      base('3d-rotate', '3D Rotate', '3D', 'Box', '#a78bfa', (i) => `contrast(${lerp(1, 1.2, i)})`, { transform: (i, c) => `perspective(900px) rotateY(${Math.sin(c.t * 2) * i * 28}deg)` }),
      base('3d-parallax', 'Parallax', '3D', 'Box', '#38bdf8', (i) => `brightness(${lerp(1, 1.1, i)})`, { transform: (i, c) => `translateX(${Math.sin(c.t * 1.5) * i * 28}px) scale(1.04)` }),
      base('3d-cube', 'Cube Spin', '3D', 'Box', '#c084fc', (i) => `saturate(${lerp(1, 1.5, i)})`, { transform: (i, c) => `perspective(900px) rotateX(${c.t * i * 22}deg)` }),
    ],
  },
  {
    name: 'Edits', icon: 'Scissors', effects: [
      base('edit-ramp', 'Speed Ramp', 'Edits', 'Scissors', '#22d3ee', (i, c) => `brightness(${1 + Math.sin(c.t * 3) * i * 0.12})`),
      base('edit-jump', 'Jump Cut', 'Edits', 'Scissors', '#f59e0b', (i, c) => `contrast(${1 + (Math.floor(c.t * 3) % 2) * i * 0.25})`),
      base('edit-freeze', 'Freeze Frame', 'Edits', 'Scissors', '#94a3b8', (i) => `saturate(${lerp(1, 0.4, i)}) contrast(${lerp(1, 1.2, i)})`),
    ],
  },
  {
    name: 'Retro', icon: 'Clapperboard', effects: [
      base('retro-film', 'Retro Film', 'Retro', 'Clapperboard', '#d97706', (i) => `sepia(${lerp(0.2, 0.95, i)}) contrast(${lerp(1, 1.25, i)})`, { ffmpeg: (i) => [`colorchannelmixer=rr=${lerp(1, 1.1, i)}:gg=${lerp(1, 0.92, i)}:bb=${lerp(1, 0.72, i)}`] }),
      base('retro-vhs', 'VHS Tape', 'Retro', 'Clapperboard', '#f43f5e', (i) => `saturate(${lerp(1, 1.7, i)}) contrast(${lerp(1, 1.3, i)}) blur(${i * 0.6}px)`),
      base('retro-90s', '90s Cam', 'Retro', 'Clapperboard', '#fb7185', (i) => `sepia(${i * 0.5}) hue-rotate(${-i * 12}deg) brightness(${1 + i * 0.1})`),
    ],
  },
  {
    name: 'Glitch', icon: 'Zap', effects: [
      base('glitch-burst', 'Glitch Burst', 'Glitch', 'Zap', '#ef4444', (i, c) => `hue-rotate(${Math.sin(c.t * 14) * i * 90}deg) contrast(${1 + i * 0.4})`),
      base('glitch-rgb', 'RGB Split', 'Glitch', 'Zap', '#06b6d4', (i, c) => `drop-shadow(${Math.sin(c.t * 9) * i * 12}px 0 #ff004c) drop-shadow(${-Math.sin(c.t * 9) * i * 12}px 0 #00e5ff)`),
      base('glitch-tear', 'Signal Tear', 'Glitch', 'Zap', '#a855f7', (i, c) => `blur(${Math.max(0, Math.sin(c.t * 18)) * i * 2}px) contrast(${1 + i * 0.5})`),
    ],
  },
  {
    name: 'Distortion', icon: 'Wand2', effects: [
      base('dist-wave', 'Wave Distort', 'Distortion', 'Wand2', '#0ea5e9', (i, c) => `blur(${i * 1.4}px) hue-rotate(${Math.sin(c.t * 4) * i * 25}deg)`),
      base('dist-bubble', 'Bubble Warp', 'Distortion', 'Wand2', '#8b5cf6', (i) => `blur(${i * 3}px) brightness(${1 + i * 0.12})`),
      base('dist-swirl', 'Swirl', 'Distortion', 'Wand2', '#14b8a6', (i, c) => `hue-rotate(${c.t * i * 12}deg) contrast(${1 + i * 0.2})`),
    ],
  },
  {
    name: 'Decor', icon: 'Palette', effects: [
      base('decor-leak', 'Light Leak', 'Decor', 'Palette', '#fb923c', (i) => `sepia(${i * 0.45}) brightness(${1 + i * 0.18})`),
      base('decor-bokeh', 'Bokeh', 'Decor', 'Palette', '#f472b6', (i) => `blur(${i * 2}px) brightness(${1 + i * 0.08})`),
      base('decor-frame', 'Frame Border', 'Decor', 'Palette', '#fbbf24', (i) => `drop-shadow(0 0 ${Math.round(i * 10)}px #fbbf24)`, { transform: (i) => `scale(${1 - i * 0.06})` }),
    ],
  },
  {
    name: 'Pet', icon: 'Sparkles', effects: [
      base('pet-zoom', 'Pet Zoom', 'Pet', 'Sparkles', '#f9a8d4', (i, c) => `brightness(${1 + Math.max(0, Math.sin(c.t * 3)) * i * 0.14})`, { transform: (i) => `scale(${1 + i * 0.12})` }),
      base('pet-glow', 'Puppy Glow', 'Pet', 'Sparkles', '#fcd34d', (i) => `drop-shadow(0 0 ${Math.round(i * 16)}px #fcd34d) saturate(${1 + i * 0.3})`),
      base('pet-wag', 'Tail Wag', 'Pet', 'Sparkles', '#fdba74', (i, c) => `hue-rotate(${Math.sin(c.t * 7) * i * 14}deg)`, { transform: (i, c) => `rotate(${Math.sin(c.t * 7) * i * 3}deg)` }),
    ],
  },
  {
    name: 'Screen', icon: 'Monitor', effects: [
      base('screen-record', 'Screen Record', 'Screen', 'Monitor', '#64748b', (i) => `contrast(${1 + i * 0.12}) brightness(${1 + i * 0.06})`),
      base('screen-cursor', 'Cursor Zoom', 'Screen', 'Monitor', '#38bdf8', (i) => `brightness(${1 + i * 0.1})`, { transform: (i, c) => `scale(${1 + Math.max(0, Math.sin(c.t * 2)) * i * 0.2})` }),
      base('screen-window', 'Window Pop', 'Screen', 'Monitor', '#818cf8', (i) => `drop-shadow(0 8px ${Math.round(i * 20)}px #0008)`, { transform: (i) => `scale(${1 - i * 0.04})` }),
    ],
  },
  {
    name: 'Christmas', icon: 'Snowflake', effects: [
      base('xmas-snow', 'Snowfall', 'Christmas', 'Snowflake', '#e0f2fe', (i) => `brightness(${1 + i * 0.12}) hue-rotate(${i * 8}deg)`),
      base('xmas-glow', 'Santa Glow', 'Christmas', 'Snowflake', '#f87171', (i) => `drop-shadow(0 0 ${Math.round(i * 18)}px #ef4444) saturate(${1 + i * 0.3})`),
      base('xmas-gift', 'Gift Reveal', 'Christmas', 'Snowflake', '#4ade80', (i, c) => `brightness(${Math.min(1, 0.6 + c.t * i)})`, { transform: (i, c) => `scale(${0.94 + Math.min(1, c.t / 2) * i * 0.06})` }),
    ],
  },
  {
    name: 'Comics', icon: 'MessageSquare', effects: [
      base('comic-pop', 'Comic Pop', 'Comics', 'MessageSquare', '#facc15', (i) => `contrast(${1 + i * 0.5}) saturate(${1 + i * 0.7})`),
      base('comic-halftone', 'Halftone', 'Comics', 'MessageSquare', '#f97316', (i) => `contrast(${1 + i * 0.6}) grayscale(${i * 0.4})`),
      base('comic-bubble', 'Speech Bubble', 'Comics', 'MessageSquare', '#38bdf8', (i) => `drop-shadow(0 0 ${Math.round(i * 12)}px #fff)`),
    ],
  },
  {
    name: 'Split', icon: 'Columns2', effects: [
      base('split-screen', 'Split Screen', 'Split', 'Columns2', '#00e5ff', (i) => `contrast(${1 + i * 0.2})`, { transform: (i) => `scaleX(${1 - i * 0.12})` }),
      base('split-double', 'Double Exposure', 'Split', 'Columns2', '#a78bfa', (i) => `brightness(${1 + i * 0.2}) blur(${i * 1.2}px)`),
      base('split-mirror', 'Mirror Split', 'Split', 'Columns2', '#34d399', (i) => `hue-rotate(${i * 30}deg)`, { transform: (i) => `scaleX(${1 - i * 0.3})` }),
    ],
  },
  {
    name: 'Graffiti', icon: 'PenTool', effects: [
      base('graf-spray', 'Spray Paint', 'Graffiti', 'PenTool', '#f472b6', (i) => `saturate(${1 + i * 1.2}) contrast(${1 + i * 0.3})`),
      base('graf-neon', 'Neon Tag', 'Graffiti', 'PenTool', '#22d3ee', (i) => `drop-shadow(0 0 ${Math.round(i * 20)}px #22d3ee) saturate(${1 + i * 0.5})`),
      base('graf-sticker', 'Sticker Pop', 'Graffiti', 'PenTool', '#fde047', (i) => `contrast(${1 + i * 0.35})`, { transform: (i, c) => `rotate(${Math.sin(c.t * 6) * i * 4}deg)` }),
    ],
  },
  {
    name: 'Celebrate', icon: 'PartyPopper', effects: [
      base('celebrate-cannon', 'Confetti Cannon', 'Celebrate', 'PartyPopper', '#fb7185', (i) => `saturate(${1 + i}) brightness(${1 + i * 0.12})`),
      base('celebrate-gold', 'Gold Burst', 'Celebrate', 'PartyPopper', '#fbbf24', (i) => `sepia(${i * 0.6}) brightness(${1 + i * 0.25})`),
      base('celebrate-fireworks', 'Fireworks', 'Celebrate', 'PartyPopper', '#c084fc', (i, c) => `brightness(${1 + Math.max(0, Math.sin(c.t * 12)) * i * 0.35}) hue-rotate(${Math.sin(c.t * 4) * i * 20}deg)`),
    ],
  },
]

export const ALL_EFFECTS: StudioEffect[] = EFFECT_CATEGORIES.flatMap((c) => c.effects)

export function getEffect(id: string): StudioEffect | undefined {
  return ALL_EFFECTS.find((e) => e.id === id)
}

/** CSS filter applied to a clip's <img>/<video> in the live preview. */
export function effectsToCss(
  effects: ClipEffect[] | undefined,
  ctx: EffectContext,
): { filter: string; transform: string } {
  const active = (effects || []).filter((e) => e.enabled)
  if (!active.length) return { filter: 'none', transform: 'none' }
  const filters: string[] = []
  const transforms: string[] = []
  for (const applied of active) {
    const def = getEffect(applied.effectId)
    if (!def) continue
    const i = clamp01(applied.intensity)
    const css = def.css(i, ctx).trim()
    if (css && css !== 'none') filters.push(css)
    const transform = def.transform?.(i, ctx).trim()
    if (transform && transform !== 'none') transforms.push(transform)
  }
  return {
    filter: filters.length ? filters.join(' ') : 'none',
    transform: transforms.length ? transforms.join(' ') : 'none',
  }
}

/** FFmpeg filters for the export pipeline. Only engine-safe filters are used. */
export function effectsToFfmpeg(effects: ClipEffect[] | undefined, clipDuration: number): string[] {
  const active = (effects || []).filter((e) => e.enabled)
  const out: string[] = []
  for (const applied of active) {
    const def = getEffect(applied.effectId)
    if (!def?.ffmpeg) continue
    out.push(...def.ffmpeg(clamp01(applied.intensity), clipDuration))
  }
  return out
}
