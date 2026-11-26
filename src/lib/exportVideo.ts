/**
 * Video export via FFmpeg.wasm (browser). Returns a Blob, or null when the
 * encoder is unavailable so the UI can show an honest message.
 */

import type { Project } from './types'

type FFmpegInstance = InstanceType<typeof import('@ffmpeg/ffmpeg').FFmpeg>

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

export async function exportVideo({
  project,
  onProgress,
}: {
  project: Project
  onProgress?: (msg: string) => void
}): Promise<Blob | null> {
  try {
    const f = await loadFFmpeg()
    const clips = [...project.clips]
      .sort((a, b) => a.start - b.start)
      .filter((c) => c.src)
    if (clips.length === 0) {
      onProgress?.('No clips on the timeline.')
      return null
    }
    for (let i = 0; i < clips.length; i++) {
      const res = await fetch(clips[i].src as string)
      const buf = new Uint8Array(await res.arrayBuffer())
      await f.writeFile(`clip-${i}.mp4`, buf)
    }
    await f.writeFile('list.txt', clips.map((_c, i) => `file 'clip-${i}.mp4'`).join('\n'))
    onProgress?.('Encoding with FFmpeg.wasm…')
    await f.exec(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'out.mp4'])
    const data = f.readFile('out.mp4')
    return new Blob([data as unknown as BlobPart], { type: 'video/mp4' })
  } catch (e) {
    onProgress?.(`Export failed: ${(e as Error)?.message || 'unknown error'}`)
    return null
  }
}
