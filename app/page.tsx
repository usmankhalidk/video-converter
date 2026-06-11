'use client'

import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { VideoRecord } from '@/lib/types'
import UploadForm from '@/components/UploadForm'
import VideoCard from '@/components/VideoCard'

export default function HomePage() {
  const [browserId, setBrowserId] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let id = localStorage.getItem('browser_id')
    if (!id) {
      id = uuidv4()
      localStorage.setItem('browser_id', id)
    }
    setBrowserId(id)
  }, [])

  useEffect(() => {
    if (!browserId) return
    fetchVideos(browserId)
  }, [browserId])

  async function fetchVideos(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/videos?browser_id=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (res.ok) setVideos(json.videos || [])
    } finally {
      setLoading(false)
    }
  }

  function handleUploaded(video: VideoRecord) {
    setVideos((prev) => [video, ...prev])
  }

  function handleConverted(updated: VideoRecord) {
    setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Video Converter</h1>
          <p className="text-gray-500">Upload any video and convert it to MP4 (H.264 + AAC)</p>
        </div>

        {browserId && (
          <div className="mb-10">
            <UploadForm browserId={browserId} onUploaded={handleUploaded} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <p className="text-center text-gray-400 py-16">No videos yet. Upload one above.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} onConverted={handleConverted} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
