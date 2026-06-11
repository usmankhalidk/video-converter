'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { StreamVideoRecord } from '@/lib/types'
import StreamVideoCard from '@/components/StreamVideoCard'

export default function StreamPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [videos, setVideos] = useState<StreamVideoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
      const res = await fetch(`/api/stream-videos?user_id=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (res.ok) setVideos(json.videos || [])
    } finally {
      setLoading(false)
    }
  }

  async function uploadFile(file: File) {
    if (!userId) return
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', userId)

      const res = await fetch('/api/stream-convert', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) {
        setUploadError(json.error || 'Conversion failed')
        return
      }
      setVideos((prev) => [json.video, ...prev])
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleLogout() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">HLS Streaming</h1>
            <p className="text-gray-500">
              Upload a video and convert it to HLS format for adaptive streaming
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {userEmail && <p className="text-sm text-gray-500">{userEmail}</p>}
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Nav */}
        <div className="flex gap-2 mb-8">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            MP4 Converter
          </Link>
          <span className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600">
            HLS Streaming
          </span>
        </div>

        {/* Upload zone */}
        {userId && (
          <div className="mb-10">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files?.[0]
                if (file) uploadFile(file)
              }}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors select-none
                ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadFile(file)
                }}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 font-medium">Converting to HLS…</p>
                  <p className="text-xs text-gray-400">This may take a minute for large videos</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-medium text-gray-700">Drop a video or click to upload</p>
                  <p className="text-sm text-gray-400">Converts to HLS (.m3u8 + .ts segments)</p>
                </div>
              )}
              {uploadError && (
                <p className="mt-3 text-sm text-red-500" onClick={(e) => e.stopPropagation()}>
                  {uploadError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Video list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <p className="text-center text-gray-400 py-16">No streams yet. Upload a video above.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {videos.map((video) => (
              <StreamVideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
