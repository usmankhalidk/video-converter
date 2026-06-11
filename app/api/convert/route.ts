import { NextRequest, NextResponse } from 'next/server'
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-convert-'))
  const inputPath = path.join(tmpDir, 'input')
  const outputPath = path.join(tmpDir, 'output.mp4')

  try {
    const { videoId } = await request.json()

    if (!videoId) {
      return NextResponse.json({ error: 'No videoId provided' }, { status: 400 })
    }

    const supabase = supabaseAdmin

    const { data: record, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Video record not found' }, { status: 404 })
    }

    // Already an MP4 — nothing to do
    if (record.video_path.toLowerCase().endsWith('.mp4')) {
      return NextResponse.json({ error: 'Video is already MP4' }, { status: 400 })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('videos')
      .download(record.video_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download video' }, { status: 500 })
    }

    await fs.writeFile(inputPath, Buffer.from(await fileData.arrayBuffer()))

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-movflags +faststart', '-preset medium', '-crf 23'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run()
    })

    const convertedBuffer = await fs.readFile(outputPath)

    // New path: same folder, same uuid, but .mp4 extension
    const convertedPath = record.video_path.replace(/\.[^/.]+$/, '.mp4')

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(convertedPath, convertedBuffer, { contentType: 'video/mp4', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Delete the original non-MP4 file from storage
    await supabase.storage.from('videos').remove([record.video_path])

    const { data: updatedRecord, error: updateError } = await supabase
      .from('videos')
      .update({ video_path: convertedPath })
      .eq('id', videoId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ video: updatedRecord })
  } catch (err) {
    console.error('Conversion error:', err)
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}
