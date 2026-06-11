import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const browserId = formData.get('browser_id') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!browserId) return NextResponse.json({ error: 'No browser_id provided' }, { status: 400 })

    const MAX_BYTES = 50 * 1024 * 1024
    const ALLOWED_EXTS = ['mp4', 'mov']

    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTS.includes(fileExt)) {
      return NextResponse.json({ error: 'Only MP4 and MOV files are supported.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 50 MB limit.' }, { status: 400 })
    }

    const supabase = supabaseAdmin
    const fileName = `${browserId}/${uuidv4()}.${fileExt || 'mp4'}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: record, error: dbError } = await supabase
      .from('videos')
      .insert({ browser_id: browserId, video_path: fileName })
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from('videos').remove([fileName])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ video: record })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
