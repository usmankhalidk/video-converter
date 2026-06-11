'use client'

import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { StreamVideoRecord } from '@/lib/types'
import { getSupabaseClient } from '@/lib/supabase'

interface Props {
  video: StreamVideoRecord
}

function HlsPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      return () => hls.destroy()
    }

    // Safari has native HLS support
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      controls
      className="w-full rounded-xl bg-black"
      style={{ maxHeight: '300px' }}
    />
  )
}

export default function StreamVideoCard({ video }: Props) {
  function getPublicUrl(playlistPath: string) {
    const { data } = getSupabaseClient().storage
      .from('video-streams')
      .getPublicUrl(playlistPath)
    return data.publicUrl
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800 truncate max-w-xs">
            {video.original_name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(video.created_at).toLocaleString()}
          </p>
        </div>

        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
          video.status === 'done'
            ? 'bg-green-100 text-green-700'
            : video.status === 'error'
            ? 'bg-red-100 text-red-600'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {video.status === 'done' ? 'Ready' : video.status === 'error' ? 'Error' : 'Processing'}
        </span>
      </div>

      {video.status === 'done' && video.playlist_path && (
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            HLS Stream
          </p>
          <HlsPlayer src={getPublicUrl(video.playlist_path)} />
          <p className="mt-2 text-xs text-gray-400 break-all">
            {getPublicUrl(video.playlist_path)}
          </p>
        </div>
      )}

      {video.status === 'processing' && (
        <div className="flex items-center gap-3 py-4">
          <div className="w-5 h-5 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-sm text-gray-500">Converting to HLS…</p>
        </div>
      )}

      {video.status === 'error' && (
        <p className="text-sm text-red-500">Conversion failed. Please try again.</p>
      )}
    </div>
  )
}
