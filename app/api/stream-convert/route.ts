import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

export const runtime = 'nodejs'
export const maxDuration = 300

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export async function POST(request: NextRequest) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hls-convert-'))

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('user_id') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'No user_id provided' }, { status: 400 })

    const supabase = createServiceClient()

    // Insert record immediately so the frontend can track it
    const { data: record, error: insertError } = await supabase
      .from('stream_videos')
      .insert({ user_id: userId, original_name: file.name, status: 'processing' })
      .select()
      .single()

    if (insertError || !record) {
      return NextResponse.json({ error: insertError?.message ?? 'DB insert failed' }, { status: 500 })
    }

    // Write uploaded file to temp dir
    const inputPath = path.join(tmpDir, 'input' + path.extname(file.name))
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(inputPath, buffer)

    const playlistPath = path.join(tmpDir, 'playlist.m3u8')
    const segmentPattern = path.join(tmpDir, 'segment%03d.ts')

    // Convert to HLS — 10-second segments, H.264 + AAC
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset medium',
          '-crf 23',
          '-hls_time 10',
          '-hls_playlist_type vod',
          `-hls_segment_filename ${segmentPattern}`,
          '-f hls',
        ])
        .output(playlistPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run()
    })

    // Read all generated files (playlist + segments)
    const files = await fs.readdir(tmpDir)
    const hlsFiles = files.filter((f) => f.endsWith('.m3u8') || f.endsWith('.ts'))

    const storagePrefix = `${userId}/${record.id}`

    // Upload every segment and the playlist
    for (const fileName of hlsFiles) {
      const filePath = path.join(tmpDir, fileName)
      const fileBuffer = await fs.readFile(filePath)
      const storagePath = `${storagePrefix}/${fileName}`
      const contentType = fileName.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t'

      const { error: uploadError } = await supabase.storage
        .from('video-streams')
        .upload(storagePath, fileBuffer, { contentType, upsert: true })

      if (uploadError) {
        await supabase.from('stream_videos').update({ status: 'error' }).eq('id', record.id)
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }
    }

    const storedPlaylistPath = `${storagePrefix}/playlist.m3u8`

    const { data: updated, error: updateError } = await supabase
      .from('stream_videos')
      .update({ playlist_path: storedPlaylistPath, status: 'done' })
      .eq('id', record.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ video: updated })
  } catch (err) {
    console.error('HLS conversion error:', err)
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}
