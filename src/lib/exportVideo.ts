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

function resolutionSize(resolution: string) {
  switch (resolution) {
    case '720p': return [1280, 720]
    case '1440p': return [2560, 1440]
    case '4K': return [3840, 2160]
    default: return [1920, 1080]
  }
}

const GAP_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=='

export async function exportVideo({
  project,
  format = 'MP4',
  resolution = '1080p',
  fps = 30,
  quality = 85,
  onProgress,
}: {
  project: Project
  format?: ExportFormat
  resolution?: string
  fps?: number
  quality?: number
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

    const [w, h] = resolutionSize(resolution)
    const crf = Math.round(32 - (quality / 100) * 14)
    const outName = format === 'GIF' ? 'out.gif' : format === 'WebM' ? 'out.webm' : 'out.mp4'
    const base = format === 'GIF'
      ? `fps=${Math.min(fps, 20)},scale=${Math.min(w, 640)}:-1:flags=lanczos`
      : `fps=${fps},scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`

    // Export-safe effect chain, in clip order. Time-based effects stay in the
    // live preview because FFmpeg.wasm cannot sample them per source clip here.
    const fx = clips.flatMap((c) =>
      effectsToFfmpeg(c.params?.effects as ClipEffect[] | undefined, c.duration),
    ).filter((filter, index, all) => all.indexOf(filter) === index)
    const filters = [base, ...fx].join(',')

    onProgress?.(`Encoding ${format} at ${resolution} / ${fps} fps…`, 65)
    if (format === 'GIF') {
      await f.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-vf', filters, '-loop', '0', outName])
    } else if (format === 'WebM') {
      await f.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-vf', filters, '-c:v', 'libvpx', '-b:v', '2M', '-crf', String(crf), '-pix_fmt', 'yuv420p', outName])
    } else {
      await f.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-vf', filters, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', String(crf), outName])
    }

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
