import { PHOTO_JPEG_QUALITY, PHOTO_MAX_PX, fitWithin } from '../../engine/photos'

/**
 * Shrinks a camera/gallery image to about 1080 px on the long side as JPEG, respecting
 * the photo's EXIF orientation, so progress photos stay small in storage and backups.
 */
export async function compressPhoto(file: Blob): Promise<Blob> {
  const source = await decode(file)
  try {
    const { width, height } = fitWithin(source.width, source.height, PHOTO_MAX_PX)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')
    ctx.drawImage(source.image, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode photo'))), 'image/jpeg', PHOTO_JPEG_QUALITY),
    )
  } finally {
    source.close()
  }
}

interface Decoded {
  image: CanvasImageSource
  width: number
  height: number
  close: () => void
}

/**
 * createImageBitmap with EXIF orientation where supported; otherwise (older Safari) an
 * <img>, which browsers already draw upright according to EXIF.
 */
async function decode(file: Blob): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
  } catch {
    const url = URL.createObjectURL(file)
    try {
      // onload rather than img.decode(): decode() can stay pending while the page is hidden.
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('Could not read image'))
        el.src = url
      })
      return { image: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
    } catch (err) {
      URL.revokeObjectURL(url)
      throw err
    }
  }
}
