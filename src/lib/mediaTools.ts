/**
 * Real, browser-based media operations used by the Tools hub.
 * No fake previews: every function returns a real Blob the user can
 * download or save into PixelCraft media.
 */

import { loadFFmpeg } from './exportVideo'

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), type, quality)
  })
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ratio = Math.max(w / img.width, h / img.height)
  const dw = img.width * ratio
  const dh = img.height * ratio
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

export async function resizeImage(file: File, width: number, height: number, fit: 'cover' | 'contain') {
  const img = await loadImage(await readFileAsDataURL(file))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.fillStyle = '#090A0F'
  ctx.fillRect(0, 0, width, height)
  if (fit === 'cover') drawCover(ctx, img, 0, 0, width, height)
  else {
    const ratio = Math.min(width / img.width, height / img.height)
    const dw = img.width * ratio
    const dh = img.height * ratio
    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh)
  }
  return canvasToBlob(canvas, file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png')
}

export async function combineImages(files: File[], cols: number, width: number, height: number) {
  if (files.length < 2) throw new Error('Pick at least two images')
  const rows = Math.ceil(files.length / cols)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.fillStyle = '#090A0F'
  ctx.fillRect(0, 0, width, height)
  const cw = width / cols
  const ch = height / rows
  for (let i = 0; i < files.length; i += 1) {
    const img = await loadImage(await readFileAsDataURL(files[i]))
    drawCover(ctx, img, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch)
  }
  return canvasToBlob(canvas)
}

export async function enhanceImage(file: File, brightness: number, contrast: number, saturation: number, blur: number) {
  const img = await loadImage(await readFileAsDataURL(file))
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})${blur > 0 ? ` blur(${blur}px)` : ''}`
  ctx.drawImage(img, 0, 0)
  return canvasToBlob(canvas, file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png')
}

export async function makeMeme(file: File, top: string, bottom: string) {
  const img = await loadImage(await readFileAsDataURL(file))
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(img, 0, 0)
  const size = Math.max(28, Math.round(img.width / 14))
  ctx.font = `800 ${size}px Impact, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.lineWidth = Math.max(4, size / 8)
  ctx.strokeStyle = '#000'
  ctx.fillStyle = '#fff'
  const draw = (text: string, y: number) => {
    const lines = text.toUpperCase().split('\n').slice(0, 3)
    lines.forEach((line, i) => {
      ctx.strokeText(line, img.width / 2, y + i * size * 1.1)
      ctx.fillText(line, img.width / 2, y + i * size * 1.1)
    })
  }
  if (top.trim()) draw(top.trim(), size * 1.2)
  if (bottom.trim()) draw(bottom.trim(), img.height - size * (bottom.trim().split('\n').length - 1) * 1.1 - size * 0.4)
  return canvasToBlob(canvas)
}

/** Simple solid-colour / green-screen keying — real FFmpeg colourkey filter. */
export async function removeSolidBackground(file: File, hex: string, similarity = 0.3, blend = 0.1) {
  const f = await loadFFmpeg()
  const input = `bg-${Date.now()}.${file.name.split('.').pop() || 'mp4'}`
  const output = `bg-out-${Date.now()}.webm`
  await f.writeFile(input, new Uint8Array(await file.arrayBuffer()))
  await f.exec(['-y', '-i', input, '-vf', `colorkey=${hex}:${similarity}:${blend}`, '-c:v', 'libvpx', '-auto-alt-ref', '0', '-pix_fmt', 'yuva420p', output])
  const data = await f.readFile(output)
  await f.deleteFile(input)
  await f.deleteFile(output)
  return new Blob([data as unknown as BlobPart], { type: 'video/webm' })
}

export async function trimVideo(file: File, start: number, end: number) {
  if (end <= start) throw new Error('End must be after start')
  const f = await loadFFmpeg()
  const input = `trim-${Date.now()}.${file.name.split('.').pop() || 'mp4'}`
  const output = `trim-out-${Date.now()}.mp4`
  await f.writeFile(input, new Uint8Array(await file.arrayBuffer()))
  await f.exec([
    '-y', '-ss', String(start), '-i', input, '-t', String(end - start),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', output,
  ])
  const data = await f.readFile(output)
  await f.deleteFile(input)
  await f.deleteFile(output)
  return new Blob([data as unknown as BlobPart], { type: 'video/mp4' })
}

export type VideoFormat = 'MP4' | 'WebM' | 'GIF'

export async function convertVideo(file: File, format: VideoFormat, resolution: string, fps: number) {
  const f = await loadFFmpeg()
  const input = `conv-${Date.now()}.${file.name.split('.').pop() || 'mp4'}`
  const output = `conv-out-${Date.now()}.${format === 'GIF' ? 'gif' : format === 'WebM' ? 'webm' : 'mp4'}`
  const sizes: Record<string, string> = { '480p': '854:480', '720p': '1280:720', '1080p': '1920:1080' }
  const scale = sizes[resolution] || sizes['720p']
  const vf = format === 'GIF'
    ? `fps=${Math.min(fps, 20)},scale=${Math.min(640, Number(scale.split(':')[0]))}:-1:flags=lanczos`
    : `fps=${fps},scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale}:(ow-iw)/2:(oh-ih)/2`
  await f.writeFile(input, new Uint8Array(await file.arrayBuffer()))
  if (format === 'GIF') await f.exec(['-y', '-i', input, '-vf', vf, '-loop', '0', output])
  else if (format === 'WebM') await f.exec(['-y', '-i', input, '-vf', vf, '-c:v', 'libvpx', '-b:v', '2M', '-c:a', 'libopus', output])
  else await f.exec(['-y', '-i', input, '-vf', vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', output])
  const data = await f.readFile(output)
  await f.deleteFile(input)
  await f.deleteFile(output)
  return new Blob([data as unknown as BlobPart], {
    type: format === 'GIF' ? 'image/gif' : format === 'WebM' ? 'video/webm' : 'video/mp4',
  })
}

export async function enhanceVideo(file: File, brightness: number, contrast: number, saturation: number, sharpen: boolean) {
  const f = await loadFFmpeg()
  const input = `enh-${Date.now()}.${file.name.split('.').pop() || 'mp4'}`
  const output = `enh-out-${Date.now()}.mp4`
  const filters = [`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`]
  if (sharpen) filters.push('unsharp=5:5:0.8')
  await f.writeFile(input, new Uint8Array(await file.arrayBuffer()))
  await f.exec(['-y', '-i', input, '-vf', filters.join(','), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', output])
  const data = await f.readFile(output)
  await f.deleteFile(input)
  await f.deleteFile(output)
  return new Blob([data as unknown as BlobPart], { type: 'video/mp4' })
}

/** Split typed text into timed caption rows (used by Auto captions). */
export function textToCaptions(text: string, secondsPerLine = 3) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((line, i) => ({ line, start: i * secondsPerLine, duration: secondsPerLine }))
}
