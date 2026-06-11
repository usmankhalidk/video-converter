export interface StreamVideoRecord {
  id: string
  user_id: string
  original_name: string
  playlist_path: string | null
  status: 'processing' | 'done' | 'error'
  created_at: string
}

export interface VideoRecord {
  id: string
  user_id: string
  browser_id: string | null
  original_video_path: string
  converted_video_path: string | null
  conversion_method: 'nextjs' | 'edge' | null
  created_at: string
}
