/**
 * Original starter templates for the template library.
 *
 * Every entry is a complete, editable layout: canvas size, background,
 * decorative shapes and real text elements. The same data powers the gallery
 * preview and the project that opens in the editor, so there are no fake
 * placeholder cards.
 */

import type { AspectRatio, Template } from '../lib/types'
import { ASPECT_RATIOS } from '../lib/projects'

type TemplateElement = Template['elements'][number]

function hash(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function t(
  id: string,
  name: string,
  category: string,
  style: string,
  text: string[],
  colors: string[],
  aspect: AspectRatio = '1:1',
): Template {
  const size = ASPECT_RATIOS[aspect]
  const { w, h } = size
  const pad = Math.round(w * 0.075)
  const primary = colors[0] || '#a371f7'
  const secondary = colors[1] || '#22d3ee'
  const tertiary = colors[2] || primary
  const variant = hash(id) % 4
  const elements: TemplateElement[] = []

  // Decorative background layers — deterministic per template, not random.
  if (variant === 0) {
    elements.push({
      type: 'shape', params: { shape: 'circle' },
      x: w * 0.52, y: h * 0.04, width: w * 0.72, height: w * 0.72,
      fill: primary, opacity: 0.2, z: 1,
    })
  } else if (variant === 1) {
    elements.push({
      type: 'shape', params: { shape: 'rect' },
      x: 0, y: 0, width: w, height: h * 0.42,
      fill: primary, opacity: 0.14, z: 1,
    })
    elements.push({
      type: 'shape', params: { shape: 'circle' },
      x: w * 0.62, y: h * 0.55, width: w * 0.55, height: w * 0.55,
      fill: secondary, opacity: 0.16, z: 2,
    })
  } else if (variant === 2) {
    elements.push({
      type: 'shape', params: { shape: 'circle' },
      x: -w * 0.18, y: h * 0.46, width: w * 0.72, height: w * 0.72,
      fill: primary, opacity: 0.18, z: 1,
    })
    elements.push({
      type: 'shape', params: { shape: 'circle' },
      x: w * 0.55, y: h * 0.1, width: w * 0.62, height: w * 0.62,
      fill: secondary, opacity: 0.14, z: 2,
    })
  } else {
    elements.push({
      type: 'shape', params: { shape: 'rect' },
      x: w * 0.66, y: 0, width: w * 0.34, height: h,
      fill: primary, opacity: 0.13, z: 1,
    })
    elements.push({
      type: 'shape', params: { shape: 'rect' },
      x: 0, y: h * 0.72, width: w, height: h * 0.28,
      fill: secondary, opacity: 0.1, z: 2,
    })
  }

  // Small accent bar above the headline.
  elements.push({
    type: 'shape', params: { shape: 'rect' },
    x: pad, y: Math.round(h * 0.1),
    width: Math.min(Math.round(w * 0.22), 280),
    height: Math.max(10, Math.round(w * 0.012)),
    fill: secondary, cornerRadius: 999, z: 3,
  })

  // Headline lines, scaled to fit the canvas width.
  const longest = Math.max(...text.map((line) => line.length), 1)
  const maxFont = aspect === '16:9' ? 108 : aspect === '9:16' ? 92 : 88
  const fitFont = Math.floor((w - pad * 2) / (longest * 0.6))
  const fontSize = clamp(Math.min(maxFont, fitFont), 30, maxFont)
  const lineHeight = Math.round(fontSize * 1.24)
  const startY = Math.round(h * (aspect === '16:9' ? 0.3 : aspect === '9:16' ? 0.34 : 0.36))

  text.forEach((line, i) => {
    elements.push({
      type: 'text',
      text: line,
      x: pad,
      y: startY + i * lineHeight,
      width: w - pad * 2,
      height: lineHeight,
      fontSize: i === 0 ? fontSize : Math.round(fontSize * 0.88),
      fontWeight: i === 0 ? 800 : 600,
      color: i === 0 ? '#FFFFFF' : colors[i % colors.length] || '#E5E7EB',
      textAlign: 'left',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      z: 10 + i,
    })
  })

  // Footer rule gives every design a finished, poster-like look.
  elements.push({
    type: 'shape', params: { shape: 'rect' },
    x: pad, y: h - pad - 18,
    width: Math.min(Math.round(w * 0.3), 300),
    height: 10,
    fill: tertiary, cornerRadius: 999, z: 5,
  })

  return {
    id,
    name,
    description: `${style} · ${aspect} design`,
    category,
    style,
    aspectRatio: aspect,
    background: '#090A0F',
    elements,
    layoutPreview: {
      colors: colors.slice(0, 4),
      shapeCount: elements.filter((el) => el.type === 'shape').length,
      textLines: text.slice(0, 3),
    },
  }
}

export const TEMPLATES: Template[] = [
  // ---------- TikTok / Reels / Shorts ----------
  t('tiktok-motivation', '5-Minute Abs Challenge', 'TikTok', 'Bold + Kinetic', ['5-MINUTE', 'ABS CHALLENGE', 'NO EQUIPMENT', 'GET STRONG'], ['#a371f7', '#22d3ee', '#ec4899', '#fbbf24'], '9:16'),
  t('reels-travel', 'Morning Coffee Vibes', 'Reels', 'Soft Aesthetic', ['Morning coffee', 'that I needed', 'today', '☕'], ['#f472b6', '#fbbf24', '#22c55e'], '9:16'),
  t('shorts-study', 'Study With Me', 'Shorts', 'Clean + Typography', ['Studying for', 'Exam Week', 'On Stream', '📚'], ['#8b5cf6', '#f3f4f6', '#22c55e'], '9:16'),
  t('tiktok-pet', 'Puppy PSA', 'TikTok', 'Cute Playful', ['Good morning from', '@puppylove 🐶', 'Send love'], ['#f472b6', '#fbbf24'], '9:16'),
  t('reels-style-transfer', 'Aesthetic Mood', 'Reels', 'Pastel Dream', ['soft vibes', 'lately'], ['#c084fc', '#f472b6', '#a5f3fc'], '9:16'),
  t('tiktok-quote', 'Quick Quote', 'TikTok', 'Minimal Typo', ['Great minds', 'think alike'], ['#fff', '#a371f7'], '9:16'),

  // ---------- Instagram ----------
  t('insta-sunset', 'Golden Hour', 'Instagram', 'Glamour Photo', ['Sunset glow', 'in my city'], ['#f472b6', '#a5f3fc'], '1:1'),
  t('insta-travel', 'Travel Notes', 'Instagram', 'Grid Clean', ['No destination', 'is small enough', 'to be unknown', '✈️'], ['#fbbf24', '#22d3ee', '#22c55e'], '1:1'),
  t('insta-fashion', 'Fit Check', 'Instagram', 'Trendy Bright', ['DAILY FIT', 'Getting ready', 'with style', '✨'], ['#ec4899', '#a371f7', '#22d3ee'], '1:1'),
  t('insta-ceo', 'CEO Vibes', 'Instagram', 'Daring Bold', ['Milestones reached', 'Journey ongoing'], ['#22d3ee', '#a371f7', '#22c55e'], '1:1'),
  t('insta-minimal', 'Minimal White', 'Instagram', 'Clean Minimal', ['Simple. Elegant.', 'That is all.'], ['#fff', '#a371f7'], '1:1'),
  t('insta-caption', 'Caption Teaser', 'Instagram', 'Playful Typography', ['guess which', 'one is fake', 'in the comments 👇'], ['#fff', '#f472b6'], '1:1'),

  // ---------- YouTube ----------
  t('yt-vlog', 'Weekly Vlog', 'YouTube', 'Vlog Warm', ['This week:', 'Friday vibes', 'Full recap below 🎥'], ['#fbbf24', '#a371f7', '#22c55e'], '16:9'),
  t('yt-gaming', 'Game Review', 'YouTube', 'High Energy', ['NEW GAME:', 'This Week in Review'], ['#a371f7', '#f43f5e', '#22d3ee'], '16:9'),
  t('yt-tutorial', 'How To', 'YouTube', 'Typography Clean', ['How to create', 'anything in 60 seconds', 'Step-by-step below 👇'], ['#22c55e', '#fbbf24', '#8b5cf6'], '16:9'),
  t('yt-cinematic', 'Cinematic Reel', 'YouTube', 'Cinematic Dark', ['A Dream', 'Through Framing', 'Fall 2026'], ['#0a0a12', '#a371f7', '#22d3ee'], '16:9'),

  // ---------- Other platforms ----------
  t('facebook-quote', 'Famous Quote', 'Facebook', 'Serif Elegant', ['“Genius is 1% inspiration and 99% perspiration.”', '— Thomas Edison'], ['#fff', '#8b5cf6'], '1:1'),
  t('facebook-ads', 'Brand Announcement', 'Facebook Ads', 'Bold Corporate', ['Introducing', 'Our New Line', 'Limited time offer'], ['#a371f7', '#22d3ee', '#fbbf24'], '1:1'),

  // ---------- Business ----------
  t('biz-cards', 'Creative Agency Card', 'Business', 'Professional Warm', ['PIXELCRAFT STUDIO', 'Creative Direction', 'Strategy & Design'], ['#a371f7', '#0a0a12', '#22d3ee'], '1:1'),
  t('biz-offer', 'Job Offer', 'Business', 'Clean Corporate', [' positioned at', 'someone you find interesting.', 'OPEN POSITION'], ['#22c55e', '#a371f7', '#fbbf24'], '4:5'),

  // ---------- Design ----------
  t('poster-anime', 'Anime Poster', 'Marketing', 'Vibrant Energy', ['GRAVITY', 'NEW EPISODE', 'NOW ON CRUNCHYROLL'], ['#a371f7', '#f43f5e', '#22d3ee', '#fbbf24'], '9:16'),
  t('ad-sale', 'Big Sale', 'Marketing', 'Bold Red Deal', ['SALES EXTENDED', 'Up to 70% off', 'The end is near'], ['#f43f5e', '#22d3ee', '#fff'], '16:9'),
  t('logo-cocoa', 'Cafe Logo', 'Logo', 'Cozy Typo', ['Café Amor', 'Est. 2025'], ['#a371f7', '#fbbf24', '#22c55e'], '1:1'),

  // ---------- Education / Motivation ----------
  t('motivation-1', 'Defense vs Destruction', 'Motivation', 'Motivational Quote', ['Defenders neutralize threats;', 'Creators build things', 'Choose the way'], ['#fbbf24', '#fff', '#a371f7'], '4:5'),
  t('motivation-2', 'Deep Work', 'Motivation', 'Minimal Type', ['Work deep. Distracted.', 'Calibrate your focus.', 'Slay your day'], ['#22c55e', '#a371f7', '#22d3ee'], '4:5'),
  t('education-flow', 'Study Flow', 'Education', 'Fresh Start', ['Quick exam tips', 'Read. Recall. Repeat.', '✨'], ['#22c55e', '#22d3ee', '#8b5cf6'], '1:1'),
  t('quote-sora', 'Quote Style', 'Quotes', 'Sora Bold', ['The biggest risk is', 'being too comfortable', 'Keep moving forward'], ['#fff', '#a371f7', '#22c55e'], '1:1'),

  // ---------- Events / Birthday ----------
  t('birthday-1', 'Happy Birthday', 'Birthday', 'Festive Fun', ['Happiest Birthday', 'Miss you all', 'Bring it on'], ['#f472b6', '#22c55e', '#fbbf24'], '1:1'),
  t('event-1', 'Concert Poster', 'Event', 'High Energy', ['MUSIC FEST', 'Summer Night', 'Front Row Tickets', '🎟️'], ['#a371f7', '#f43f5e', '#fbbf24'], '9:16'),

  // ---------- Travel ----------
  t('travel-5', '5 Best Destinations', 'Travel', 'Travel Guide', ['5 Best Destinations', 'For Every Holiday', 'Pack your bags'], ['#22c55e', '#a5f3fc', '#fbbf24'], '1:1'),

  // ---------- Fashion / Sports ----------
  t('fashion-wool', 'Wool Designer Fit', 'Fashion', 'Trendy Bold', ['ORIGINAL DESIGN', 'Handmade Fit', 'Limited Drop'], ['#a371f7', '#22c55e', '#22d3ee'], '9:16'),
  t('sports-live', 'Live Sports', 'Sports', 'High Contrast', ['LIVE NOW', 'downturn', 'Watch now ⏵'], ['#f43f5e', '#22c55e', '#fff'], '16:9'),
]

export default TEMPLATES
