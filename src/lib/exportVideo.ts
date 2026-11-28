/**
 * Video export via FFmpeg.wasm (browser). Returns a real Blob, or null when
 * the encoder cannot process the timeline (so the UI can show an honest
 * message instead of pretending the export succeeded).
 */

import { effectsToFfmpeg, type ClipEffect } from '../data/effects'
import type { Project } from './types'

type FFmpegInstance = InstanceType<typeof import('@ffmpeg/ffmpeg').FFmpeg>
export type ExportFormat = 'MP4' | 'WebM' | 'GIF'

let ffmpeg: FFmpegInstance | null = null
let loading: Promise<FFmpegInstance> | null = null

export async function loadFFmpeg(): Promise<FFmpegInstance> {
  if (ffmpeg) return ffmpeg
  if (loading) return loading
  loading = (async () => {
    const mod = await import('@ffmpeg/ffmpeg')
    const f = new mod.FFmpeg()
    await f.load()
    ffmpeg = f
    return f
  })()
  try {
    return await loading
  } finally {
    loading = null
  }
}

export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await loadFFmpeg()
    return true
  } catch {
    return false
  }
}

function resolutionSize(resolution: string, project: Project): [number, number] {
  switch (resolution) {
    case '720p': return [1280, 720]
    case '1440p': return [2560, 1440]
    case '4K': return [3840, 2160]
    case 'Project': return [project.canvasWidth || 1920, project.canvasHeight || 1080]
    default: return [1920, 1080]
  }
}

/** Translate the CSS look used by the live preview into FFmpeg filters. */
function cssFilterToFfmpeg(filter?: string): string[] {
  if (!filter || filter === 'none') return []
  const out: string[] = []
  const sepia = filter.match(/sepia\(([\d.]+)\)/)
  if (sepia) {
    const i = Number(sepia[1])
    out.push(`colorchannelmixer=rr=${1 - 0.3 * i}:gg=${1 - 0.15 * i}:bb=${1 - 0.5 * i}`)
  }
  const hue = filter.match(/hue-rotate\((-?[\d.]+)deg\)/)
  if (hue) out.push(`hue=h=${(Number(hue[1]) / 360).toFixed(4)}`)
  const blur = filter.match(/blur\(([\d.]+)px\)/)
  if (blur) out.push(`gblur=sigma=${(Number(blur[1]) / 2).toFixed(2)}`)
  if (/grayscale\(1\)/.test(filter)) out.push('hue=s=0')
  return out
}

const GAP_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=='

/** Real audio needs a real container name; reusing .mp4 for MP3 broke exports. */
function isAudioClipSrc(src?: string): boolean {
  if (!src) return false
  const lower = src.toLowerCase()
  if (lower.startsWith('data:audio/')) return true
  const clean = lower.split('?')[0]
  return /\.(mp3|ogg|wav|m4a|aac|flac)$/.test(clean)
}

function clipExtension(src: string): string {
  const lower = src.toLowerCase()
  if (lower.startsWith('data:image')) return 'png'
  const dataMime = lower.match(/^data:([^;,]+)/)?.[1]
  if (dataMime) {
    if (dataMime === 'audio/mpeg' || dataMime === 'audio/mp3') return 'mp3'
    if (dataMime === 'audio/ogg') return 'ogg'
    if (dataMime === 'audio/wav' || dataMime === 'audio/x-wav') return 'wav'
    if (dataMime === 'audio/mp4' || dataMime === 'audio/x-m4a' || dataMime === 'audio/aac') return 'm4a'
    if (dataMime.startsWith('video/')) return 'mp4'
  }
  const clean = lower.split('?')[0]
  if (/\.ogg$/.test(clean)) return 'ogg'
  if (/\.mp3$/.test(clean)) return 'mp3'
  if (/\.wav$/.test(clean)) return 'wav'
  if (/\.m4a$/.test(clean) || /\.aac$/.test(clean)) return 'm4a'
  if (/\.(png|jpe?g|webp|gif)$/.test(clean)) return 'png'
  return 'mp4'
}

export async function exportVideo({
  project,
  format = 'MP4',
  resolution = '1080p',
  fps = 30,
  quality = 85,
  volume = 1,
  overlayPng,
  onProgress,
}: {
  project: Project
  format?: ExportFormat
  resolution?: string
  fps?: number
  quality?: number
  volume?: number
  /** Transparent PNG of the studio's text/shape layers, composited over the video. */
  overlayPng?: string
  onProgress?: (msg: string, progress?: number) => void
}): Promise<Blob | null> {
  const written: string[] = []
  try {
    onProgress?.('Loading video engine…', 5)
    const f = await loadFFmpeg()
    // SVG thumbnails are UI-only; never send them to the video encoder.
    const allClips = [...(project.clips || [])]
      .sort((a, b) => a.start - b.start)
      .filter((c) => c.src && !c.src.startsWith('data:image/svg+xml'))
    const visualClips = allClips.filter((c) => !isAudioClipSrc(c.src))
    const audioClips = allClips.filter((c) => isAudioClipSrc(c.src))
    const total = Math.max(1, ...allClips.map((c) => c.start + c.duration))
    if (!visualClips.length && !audioClips.length) {
      onProgress?.('No decodable video, image or music clips on the timeline.')
      return null
    }

    const visualNames: string[] = []
    for (let i = 0; i < visualClips.length; i += 1) {
      const name = `visual-${i}.${clipExtension(visualClips[i].src as string)}`
      onProgress?.(`Preparing clip ${i + 1} of ${visualClips.length}…`, 5 + Math.round(((i + 1) / Math.max(1, allClips.length)) * 40))
      const res = await fetch(visualClips[i].src as string)
      if (!res.ok) throw new Error(`could not read visual clip ${i + 1}`)
      await f.writeFile(name, new Uint8Array(await res.arrayBuffer()))
      written.push(name)
      visualNames.push(name)
    }

    const audioNames: string[] = []
    for (let i = 0; i < audioClips.length; i += 1) {
      const name = `music-${i}.${clipExtension(audioClips[i].src as string)}`
      onProgress?.(`Preparing music ${i + 1} of ${audioClips.length}…`, 25 + Math.round(((i + 1) / Math.max(1, audioClips.length)) * 20))
      const res = await fetch(audioClips[i].src as string)
      if (!res.ok) throw new Error(`could not read music ${i + 1}`)
      await f.writeFile(name, new Uint8Array(await res.arrayBuffer()))
      written.push(name)
      audioNames.push(name)
    }

    // Honour timeline positions and clip durations, including empty gaps.
    const lines: string[] = []
    if (!visualClips.length) {
      lines.push("file 'gap.png'", `duration ${total.toFixed(3)}`)
    } else {
      let cursor = 0
      for (let i = 0; i < visualClips.length; i += 1) {
        const gap = Math.max(0, visualClips[i].start - cursor)
        if (gap > 0.05) lines.push("file 'gap.png'", `duration ${gap.toFixed(3)}`)
        lines.push(`file '${visualNames[i]}'`, `duration ${Math.max(0.05, visualClips[i].duration).toFixed(3)}`)
        cursor = Math.max(cursor, visualClips[i].start + visualClips[i].duration)
      }
    }
    lines.push("file 'gap.png'")
    const gapBytes = await fetch(GAP_PIXEL).then((r) => r.arrayBuffer())
    await f.writeFile('gap.png', new Uint8Array(gapBytes as ArrayBuffer))
    written.push('gap.png')
    await f.writeFile('list.txt', lines.join('\n'))
    written.push('list.txt')

    const [w, h] = resolutionSize(resolution, project)
    const crf = Math.round(32 - (quality / 100) * 14)
    const outName = format === 'GIF' ? 'out.gif' : format === 'WebM' ? 'out.webm' : 'out.mp4'
    const base = format === 'GIF'
      ? `fps=${Math.min(fps, 20)},scale=${Math.min(w, 640)}:-1:flags=lanczos`
      : `fps=${fps},scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`

    const preFilters: string[] = []
    const rates = visualClips.map((c) => Math.max(0.25, Math.min(4, Number(c.params?.rate ?? c.rate ?? 1))))
    const avgRate = visualClips.length
      ? rates.reduce((sum, r) => sum + r, 0) / visualClips.length
      : 1
    if (Math.abs(avgRate - 1) > 0.01) preFilters.push(`setpts=PTS/${avgRate.toFixed(3)}`)
    let cw = w
    let ch = h
    const cropClip = visualClips.find((c) => c.params?.mask || c.params?.cropTop || c.params?.cropRight || c.params?.cropBottom || c.params?.cropLeft)
    if (cropClip) {
      const pad = cropClip.params?.mask ? 6 : 0
      const top = pad + Number(cropClip.params?.cropTop || 0)
      const right = pad + Number(cropClip.params?.cropRight || 0)
      const bottom = pad + Number(cropClip.params?.cropBottom || 0)
      const left = pad + Number(cropClip.params?.cropLeft || 0)
      const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)
      cw = even(w * (1 - (left + right) / 100))
      ch = even(h * (1 - (top + bottom) / 100))
      preFilters.push(`crop=${cw}:${ch}:${even(w * left / 100)}:${even(h * top / 100)}`)
    }

    // Export-safe clip effects plus the project's global look/grading.
    const fx = visualClips.flatMap((c) =>
      effectsToFfmpeg(c.params?.effects as ClipEffect[] | undefined, c.duration),
    ).filter((filter, index, all) => all.indexOf(filter) === index)
    const look = cssFilterToFfmpeg(project.effects?.filter)
    const brightness = Number(project.effects?.brightness ?? 1)
    const contrast = Number(project.effects?.contrast ?? 1)
    const saturation = Number(project.effects?.saturation ?? 1)
    const eq: string[] = []
    if (brightness !== 1) eq.push(`brightness=${((brightness - 1) * 0.5).toFixed(3)}`)
    if (contrast !== 1) eq.push(`contrast=${contrast.toFixed(3)}`)
    if (saturation !== 1) eq.push(`saturation=${saturation.toFixed(3)}`)
    if (eq.length) look.push(`eq=${eq.join(':')}`)

    const fadeIn = Math.max(0, ...visualClips.map((c) => Number(c.params?.fadeIn || 0)))
    const fadeOut = Math.max(0, ...visualClips.map((c) => Number(c.params?.fadeOut || 0)))
    const opacity = visualClips.length
      ? Math.min(1, ...visualClips.map((c) => Number(c.params?.opacity ?? 1)))
      : 1
    const postFilters: string[] = []
    if (fadeIn > 0) postFilters.push(`fade=t=in:st=0:d=${Math.min(total || 1, fadeIn).toFixed(3)}`)
    if (opacity < 1) postFilters.push(`format=rgba,colorchannelmixer=aa=${Math.max(0, opacity).toFixed(3)},format=yuv420p`)
    if (fadeOut > 0) postFilters.push(`fade=t=out:st=${Math.max(0, total - fadeOut).toFixed(3)}:d=${Math.min(total || 1, fadeOut).toFixed(3)}`)

    const videoChain = [...preFilters, base, ...fx, ...look, ...postFilters].join(',')
    const args = ['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt']
    for (const name of audioNames) args.push('-i', name)

    const filterParts: string[] = []
    if (overlayPng) {
      const bytes = await fetch(overlayPng).then((r) => r.arrayBuffer())
      await f.writeFile('overlay.png', new Uint8Array(bytes as ArrayBuffer))
      written.push('overlay.png')
      const overlayInput = audioNames.length + 1
      filterParts.push(`[0:v]${videoChain}[v0]`)
      filterParts.push(`[${overlayInput}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,format=rgba[ov]`)
      filterParts.push('[v0][ov]overlay=0:0:format=auto[v]')
    } else {
      filterParts.push(`[0:v]${videoChain}[v]`)
    }

    const hasAudio = audioNames.length > 0 && volume > 0.001
    if (hasAudio) {
      const audioFilterParts = audioClips.map((c, i) => {
        const clipGain = c.params?.muted ? 0 : Number(c.params?.volume ?? 1)
        const gain = Math.max(0, Math.min(1, volume * clipGain))
        const delayMs = Math.round(Math.max(0, c.start) * 1000)
        const dur = Math.max(0.05, c.duration)
        return `[${i + 1}:a]atrim=0:${dur.toFixed(3)},asetpts=PTS-STARTPTS,adelay=${delayMs}:all=1,volume=${gain.toFixed(3)}[a${i}]`
      })
      filterParts.push(...audioFilterParts)
      filterParts.push(
        `${audioClips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audioClips.length}:duration=longest:normalize=0,apad,atrim=0:${total.toFixed(3)}[a]`,
      )
    }

    args.push('-filter_complex', filterParts.join(';'))
    args.push('-map', '[v]')
    if (hasAudio) args.push('-map', '[a]')
    else args.push('-an')

    if (format === 'GIF') args.push('-loop', '0')
    if (format === 'WebM') {
      args.push('-c:v', 'libvpx', '-b:v', '2M', '-crf', String(crf), '-pix_fmt', 'yuv420p')
      if (hasAudio) args.push('-c:a', 'libopus', '-b:a', '128k')
    }
    if (format === 'MP4') {
      args.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', String(crf))
      if (hasAudio) args.push('-c:a', 'aac', '-b:a', '192k')
    }
    args.push(outName)

    onProgress?.(`Encoding ${format} at ${resolution} / ${fps} fps…`, 65)
    await f.exec(args)

    // @ffmpeg/ffmpeg 0.12 readFile is async. Without this await, the Blob
    // contains "[object Promise]" instead of real video bytes.
    const data = await f.readFile(outName)
    const mime = format === 'GIF' ? 'image/gif' : format === 'WebM' ? 'video/webm' : 'video/mp4'
    onProgress?.('Export complete', 98)
    return new Blob([data as BlobPart], { type: mime })
  } catch (e) {
    onProgress?.(`Export failed: ${(e as Error)?.message || 'unknown error'}`)
    return null
  } finally {
    if (ffmpeg) {
      for (const name of [...written, 'out.mp4', 'out.webm', 'out.gif']) {
        try { await ffmpeg.deleteFile(name) } catch { /* nothing to clean up */ }
      }
    }
  }
}
