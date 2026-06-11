'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { VideoRecord } from '@/lib/types'

interface VideoCardProps {
  video: VideoRecord
  onConverted: (updated: VideoRecord) => void
}

export default function VideoCard({ video, onConverted }: VideoCardProps) {
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isMp4 = video.video_path.toLowerCase().endsWith('.mp4')

  function getPublicUrl(path: string) {
    const { data } = supabase.storage.from('videos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleConvert() {
    setConverting(true)
    setProgress(0)
    setError(null)
    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      })

      if (!res.body) {
        setError('Conversion failed. Please try again.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        // SSE events are separated by double newlines
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          const line = event.trim()
          if (!line.startsWith('data: ')) continue
          let data: Record<string, unknown>
          try {
            data = JSON.parse(line.slice(6))
          } catch {
            continue
          }
          if (typeof data.percent === 'number') setProgress(data.percent)
          if (data.error) { setError(data.error as string); return }
          if (data.done) { onConverted(data.video as VideoRecord); return }
        }
      }
    } catch {
      setError('Conversion failed. Please try again.')
    } finally {
      setConverting(false)
      setProgress(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {isMp4 ? 'Video' : 'Original Video'}
        </p>
        <video
          src={getPublicUrl(video.video_path)}
          controls
          className="w-full rounded-xl bg-black"
          style={{ maxHeight: '300px' }}
        />
      </div>

      {!isMp4 && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleConvert}
            disabled={converting}
            className="w-full py-2 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {converting && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {converting
              ? `Converting… ${progress !== null && progress > 0 ? `${progress}%` : ''}`
              : 'Convert to MP4'}
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
