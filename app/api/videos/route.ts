import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const browserId = request.nextUrl.searchParams.get('browser_id')

  if (!browserId) {
    return NextResponse.json({ error: 'No browser_id provided' }, { status: 400 })
  }

  const supabase = supabaseAdmin

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('browser_id', browserId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ videos: data })
}
