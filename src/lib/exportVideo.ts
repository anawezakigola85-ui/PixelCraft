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
    const clips = [...(project.clips || [])]
      .sort((a, b) => a.start - b.start)
      .filter((c) => c.src && !c.src.startsWith('data:image/svg+xml'))
    if (clips.length === 0) {
      onProgress?.('No decodable video or image clips on the timeline.')
      return null
    }

    const names: string[] = []
    for (let i = 0; i < clips.length; i += 1) {
      const ext = clips[i].src?.includes('data:image') ? 'png' : 'mp4'
      const name = `clip-${i}.${ext}`
      onProgress?.(`Preparing clip ${i + 1} of ${clips.length}…`, 5 + Math.round(((i + 1) / clips.length) * 50))
      const res = await fetch(clips[i].src as string)
      if (!res.ok) throw new Error(`could not read clip ${i + 1}`)
      await f.writeFile(name, new Uint8Array(await res.arrayBuffer()))
      written.push(name)
      names.push(name)
    }

    // Honour timeline positions and clip durations, including empty gaps.
    const lines: string[] = []
    let cursor = 0
    for (let i = 0; i < clips.length; i += 1) {
      const gap = Math.max(0, clips[i].start - cursor)
      if (gap > 0.05) lines.push("file 'gap.png'", `duration ${gap.toFixed(3)}`)
      lines.push(`file '${names[i]}'`, `duration ${Math.max(0.05, clips[i].duration).toFixed(3)}`)
      cursor = Math.max(cursor, clips[i].start + clips[i].duration)
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
    const rates = clips.map((c) => Math.max(0.25, Math.min(4, Number(c.params?.rate ?? c.rate ?? 1))))
    const avgRate = rates.reduce((sum, r) => sum + r, 0) / Math.max(1, rates.length)
    if (Math.abs(avgRate - 1) > 0.01) preFilters.push(`setpts=PTS/${avgRate.toFixed(3)}`)
    let cw = w
    let ch = h
    const cropClip = clips.find((c) => c.params?.mask || c.params?.cropTop || c.params?.cropRight || c.params?.cropBottom || c.params?.cropLeft)
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
    const fx = clips.flatMap((c) =>
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

    const total = clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0)
    const fadeIn = Math.max(0, ...clips.map((c) => Number(c.params?.fadeIn || 0)))
    const fadeOut = Math.max(0, ...clips.map((c) => Number(c.params?.fadeOut || 0)))
    const opacity = Math.min(1, ...clips.map((c) => Number(c.params?.opacity ?? 1)))
    const postFilters: string[] = []
    if (fadeIn > 0) postFilters.push(`fade=t=in:st=0:d=${Math.min(total || 1, fadeIn).toFixed(3)}`)
    if (opacity < 1) postFilters.push(`format=rgba,colorchannelmixer=aa=${Math.max(0, opacity).toFixed(3)},format=yuv420p`)
    if (fadeOut > 0) postFilters.push(`fade=t=out:st=${Math.max(0, total - fadeOut).toFixed(3)}:d=${Math.min(total || 1, fadeOut).toFixed(3)}`)

    const videoChain = [...preFilters, base, ...fx, ...look, ...postFilters].join(',')
    const args = ['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt']
    if (overlayPng) {
      const bytes = await fetch(overlayPng).then((r) => r.arrayBuffer())
      await f.writeFile('overlay.png', new Uint8Array(bytes as ArrayBuffer))
      written.push('overlay.png')
      args.push('-i', 'overlay.png')
      args.push(
        '-filter_complex',
        `[0:v]${videoChain}[v0];[1:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,format=rgba[ov];[v0][ov]overlay=0:0:format=auto[v]`,
        '-map', '[v]',
      )
    } else {
      args.push('-vf', videoChain)
    }
    if (format === 'GIF') args.push('-loop', '0')
    if (format !== 'GIF') {
      const audioClips = clips.filter((c) => c.src?.startsWith('data:audio'))
      const clipGain = audioClips.length
        ? Math.min(1, ...audioClips.map((c) => c.params?.muted ? 0 : Number(c.params?.volume ?? 1)))
        : 1
      const audioGain = Math.max(0, Math.min(1, volume * clipGain))
      if (audioGain <= 0.001) args.push('-an')
      else args.push('-af', `volume=${audioGain.toFixed(3)}`)
    }
    if (format === 'WebM') args.push('-c:v', 'libvpx', '-b:v', '2M', '-crf', String(crf), '-pix_fmt', 'yuv420p')
    if (format === 'MP4') args.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', String(crf))
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
