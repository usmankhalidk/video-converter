'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { VideoRecord } from '@/lib/types'

interface VideoCardProps {
  video: VideoRecord
  onConverted: (updated: VideoRecord) => void
}

export default function VideoCard({ video, onConverted }: VideoCardProps) {
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getPublicUrl(path: string) {
    const { data } = getSupabaseClient().storage.from('videos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleConvert() {
    setConverting(true)
    setError(null)
    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Conversion failed')
        return
      }
      onConverted(json.video)
    } catch {
      setError('Conversion failed. Please try again.')
    } finally {
      setConverting(false)
    }
  }

  const originalUrl = getPublicUrl(video.original_video_path)
  const convertedUrl = video.converted_video_path
    ? getPublicUrl(video.converted_video_path)
    : null

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Original Video
        </p>
        <video
          src={originalUrl}
          controls
          className="w-full rounded-xl bg-black"
          style={{ maxHeight: '300px' }}
        />
      </div>

      {convertedUrl ? (
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Converted Video
          </p>
          <video
            src={convertedUrl}
            controls
            className="w-full rounded-xl bg-black"
            style={{ maxHeight: '300px' }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleConvert}
            disabled={converting}
            className="w-full py-2 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {converting ? 'Converting…' : 'Convert to MP4'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Uploaded {new Date(video.created_at).toLocaleString()}
      </p>
    </div>
  )
}
