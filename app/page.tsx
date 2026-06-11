'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { VideoRecord } from '@/lib/types'
import { createBrowserClient } from '@/lib/supabase'
import UploadForm from '@/components/UploadForm'
import VideoCard from '@/components/VideoCard'

export default function HomePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setUserEmail(user.email ?? null)
      fetchVideos(user.id)
    })
  }, [])

  async function fetchVideos(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/videos?user_id=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (res.ok) setVideos(json.videos || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
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
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Video Converter</h1>
            <p className="text-gray-500">Upload any video and convert it to MP4 (H.264 + AAC)</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {userEmail && (
              <p className="text-sm text-gray-500">{userEmail}</p>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-2 mb-8">
          <span className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600">
            MP4 Converter
          </span>
          <Link
            href="/stream"
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            HLS Streaming
          </Link>
        </div>

        {userId && (
          <div className="mb-10">
            <UploadForm userId={userId} onUploaded={handleUploaded} />
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
