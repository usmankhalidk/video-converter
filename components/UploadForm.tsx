'use client'

import { useRef, useState } from 'react'
import { VideoRecord } from '@/lib/types'

const MAX_SIZE_MB = 50
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ALLOWED_EXTENSIONS = ['mp4', 'mov']
const ALLOWED_MIME = ['video/mp4', 'video/quicktime']

interface UploadFormProps {
  browserId: string
  onUploaded: (video: VideoRecord) => void
}

export default function UploadForm({ browserId, onUploaded }: UploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function validate(file: File): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME.includes(file.type)) {
      return 'Only MP4 and MOV files are supported.'
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large. Maximum size is ${MAX_SIZE_MB} MB.`
    }
    return null
  }

  async function uploadFile(file: File) {
    setError(null)
    const validationError = validate(file)
    if (validationError) {
      setError(validationError)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('browser_id', browserId)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Upload failed')
        return
      }
      onUploaded(json.video)
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors select-none
        ${uploading ? 'cursor-default opacity-60' : 'cursor-pointer'}
        ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.mov,video/mp4,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Uploading…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="font-medium text-gray-700">Drop a video or click to upload</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">MP4</span>
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">MOV</span>
            <span className="text-xs text-gray-400">· Max {MAX_SIZE_MB} MB</span>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-500" onClick={(e) => e.stopPropagation()}>
          {error}
        </p>
      )}
    </div>
  )
}
