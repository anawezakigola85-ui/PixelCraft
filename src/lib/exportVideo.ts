/**
 * Video export via FFmpeg.wasm (browser). Returns a Blob, or null when the
 * encoder is unavailable so the UI can show an honest message and fall back
 * to exporting the project JSON.
 */

import type { Project } from './types'

type FFmpegInstance = InstanceType<typeof import('@ffmpeg/ffmpeg').FFmpeg>
export type ExportFormat = 'MP4' | 'WebM' | 'GIF'

let ffmpeg: FFmpegInstance | null = null

export async function loadFFmpeg(): Promise<FFmpegInstance> {
  if (ffmpeg) return ffmpeg
  const mod = await import('@ffmpeg/ffmpeg')
  const f = new mod.FFmpeg()
  await f.load()
  ffmpeg = f
  return f
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
  onProgress?: (msg: string) => void
}): Promise<Blob | null> {
  try {
    const f = await loadFFmpeg()
    // SVG thumbnails are UI-only; never send them to the video encoder.
    const clips = [...project.clips]
      .sort((a, b) => a.start - b.start)
      .filter((c) => c.src && !c.src.startsWith('data:image/svg+xml'))
    if (clips.length === 0) {
      onProgress?.('No decodable video or image clips on the timeline.')
      return null
    }

    const files: string[] = []
    for (let i = 0; i < clips.length; i += 1) {
      const ext = clips[i].src?.includes('data:image') ? 'png' : 'mp4'
      const name = `clip-${i}.${ext}`
      const res = await fetch(clips[i].src as string)
      const buf = new Uint8Array(await res.arrayBuffer())
      await f.writeFile(name, buf)
      files.push(name)
    }

    await f.writeFile('list.txt', files.map((name) => `file '${name}'`).join('\n'))
    const [w, h] = resolutionSize(resolution)
    const crf = Math.round(32 - (quality / 100) * 14)
    const outName = format === 'GIF' ? 'out.gif' : format === 'WebM' ? 'out.webm' : 'out.mp4'

    const filters = format === 'GIF'
      ? `fps=${Math.min(fps, 20)},scale=${Math.min(w, 640)}:-1:flags=lanczos`
      : `fps=${fps},scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`

    onProgress?.(`Encoding ${format} at ${resolution} / ${fps} fps…`)
    if (format === 'GIF') {
      await f.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-vf', filters, '-loop', '0', outName])
    } else if (format === 'WebM') {
      await f.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-vf', filters, '-c:v', 'libvpx', '-b:v', '2M', '-crf', String(crf), outName])
    } else {
      await f.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-vf', filters, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(crf), outName])
    }

    const data = f.readFile(outName)
    const mime = format === 'GIF' ? 'image/gif' : format === 'WebM' ? 'video/webm' : 'video/mp4'
    return new Blob([data as unknown as BlobPart], { type: mime })
  } catch (e) {
    onProgress?.(`Export failed: ${(e as Error)?.message || 'unknown error'}`)
    return null
  }
}
