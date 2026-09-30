import { useEffect, useState } from 'react'

interface Props {
  blob: Blob
  alt: string
  className?: string
  /** 'cover' crops to fill (thumbnails); 'contain' shows the whole photo (compare, full view). */
  fit?: 'cover' | 'contain'
}

/** Shows a stored photo blob; the object URL is released when it's no longer shown. */
export function PhotoImage({ blob, alt, className = '', fit = 'cover' }: Props) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url ? (
    <img src={url} alt={alt} className={`${fit === 'cover' ? 'object-cover' : 'bg-black object-contain'} ${className}`} />
  ) : (
    <div className={`bg-surface ${className}`} />
  )
}
