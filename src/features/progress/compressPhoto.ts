import { PHOTO_JPEG_QUALITY, PHOTO_MAX_PX, fitWithin } from '../../engine/photos'

/**
 * Shrinks a camera/gallery image to about 1080 px on the long side as JPEG, respecting
 * the photo's EXIF orientation, so progress photos stay small in storage and backups.
 */
export async function compressPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_PX)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')
    ctx.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode photo'))), 'image/jpeg', PHOTO_JPEG_QUALITY),
    )
  } finally {
    bitmap.close()
  }
}
