import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

export const runtime = 'nodejs'
export const maxDuration = 300

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export async function POST(request: NextRequest) {
  const { videoId } = await request.json()

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'No videoId provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  function send(data: object) {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-convert-'))
    const inputPath = path.join(tmpDir, 'input')
    const outputPath = path.join(tmpDir, 'output.mp4')

    try {
      const supabase = supabaseAdmin

      const { data: record, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single()

      if (fetchError || !record) {
        send({ error: 'Video record not found' })
        return
      }

      if (record.video_path.toLowerCase().endsWith('.mp4')) {
        send({ error: 'Video is already MP4' })
        return
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('videos')
        .download(record.video_path)

      if (downloadError || !fileData) {
        send({ error: 'Failed to download video' })
        return
      }

      await fs.writeFile(inputPath, Buffer.from(await fileData.arrayBuffer()))

      // Try stream copy first — instant if codecs are already MP4-compatible (H.264/AAC).
      // Fall back to re-encoding with ultrafast preset if copy fails.
      const runFfmpeg = (copyOnly: boolean) =>
        new Promise<void>((resolve, reject) => {
          const cmd = ffmpeg(inputPath).output(outputPath)
          if (copyOnly) {
            cmd.outputOptions(['-c copy', '-movflags +faststart'])
          } else {
            cmd
              .videoCodec('libx264')
              .audioCodec('aac')
              .outputOptions(['-movflags +faststart', '-preset ultrafast', '-crf 23'])
              .on('progress', (p) => {
                const percent = Math.min(99, Math.max(0, Math.round(p.percent ?? 0)))
                send({ percent })
              })
          }
          cmd.on('end', () => resolve()).on('error', (err) => reject(err)).run()
        })

      try {
        await runFfmpeg(true)
      } catch {
        await fs.rm(outputPath, { force: true }).catch(() => {})
        await runFfmpeg(false)
      }

      const convertedBuffer = await fs.readFile(outputPath)
      const convertedPath = record.video_path.replace(/\.[^/.]+$/, '.mp4')

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(convertedPath, convertedBuffer, { contentType: 'video/mp4', upsert: true })

      if (uploadError) {
        send({ error: uploadError.message })
        return
      }

      await supabase.storage.from('videos').remove([record.video_path])

      const { data: updatedRecord, error: updateError } = await supabase
        .from('videos')
        .update({ video_path: convertedPath })
        .eq('id', videoId)
        .select()
        .single()

      if (updateError) {
        send({ error: updateError.message })
        return
      }

      send({ done: true, video: updatedRecord })
    } catch (err) {
      console.error('Conversion error:', err)
      send({ error: 'Conversion failed' })
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
      writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
