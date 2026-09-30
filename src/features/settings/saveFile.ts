/** Saves bytes as a download (Android Chrome puts it in Downloads). */
export function downloadBytes(bytes: Uint8Array, fileName: string, type = 'application/zip') {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function canShareFiles(): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([], 'test.zip', { type: 'application/zip' })] })
  } catch {
    return false
  }
}

/** Opens the Android share sheet (Drive, WhatsApp, email…). Resolves false if cancelled. */
export async function shareBytes(bytes: Uint8Array, fileName: string, type = 'application/zip'): Promise<boolean> {
  try {
    await navigator.share({ files: [new File([bytes as BlobPart], fileName, { type })], title: fileName })
    return true
  } catch {
    return false
  }
}
