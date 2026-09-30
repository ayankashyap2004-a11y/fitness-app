import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from '../../platform'

/** Base64 without blowing the call stack on large files. */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

/**
 * Saves a file where the user can find it and returns a short description of where.
 * Web: a normal download (Android Chrome puts it in Downloads).
 * APK: the phone's Documents folder (a WebView can't use <a download>).
 */
export async function saveBytes(bytes: Uint8Array, fileName: string, type = 'application/zip'): Promise<string> {
  if (isNative) {
    const perm = await Filesystem.checkPermissions()
    if (perm.publicStorage !== 'granted') await Filesystem.requestPermissions()
    await Filesystem.writeFile({ path: fileName, data: toBase64(bytes), directory: Directory.Documents, recursive: true })
    return `Documents/${fileName}`
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'Downloads'
}

export function canShareFiles(): boolean {
  if (isNative) return true
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([], 'test.zip', { type: 'application/zip' })] })
  } catch {
    return false
  }
}

/** Opens the Android share sheet (Drive, WhatsApp, email…). Resolves false if cancelled or unavailable. */
export async function shareBytes(bytes: Uint8Array, fileName: string, type = 'application/zip'): Promise<boolean> {
  try {
    if (isNative) {
      const { uri } = await Filesystem.writeFile({ path: fileName, data: toBase64(bytes), directory: Directory.Cache })
      await Share.share({ title: fileName, files: [uri] })
      return true
    }
    await navigator.share({ files: [new File([bytes as BlobPart], fileName, { type })], title: fileName })
    return true
  } catch {
    return false
  }
}
