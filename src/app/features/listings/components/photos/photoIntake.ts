/**
 * Choosing photos in the publishing wizard (ADR-043 step 3, bugs 11 and 13):
 * which chosen photos this browser can use, and the one sentence that says
 * what happened to the rest.
 */

// Every browser opens these; no need to decode them to know.
const ALWAYS_USABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const USABLE_EXTENSION = /\.(jpe?g|png|webp|gif)$/i

/**
 * True when this browser can open the photo, so it can be shrunk and
 * uploaded. An iPhone HEIC photo opens in Safari but not in Chrome; before,
 * it was only refused at the very end, when publishing.
 */
export async function isUsablePhoto(file: File): Promise<boolean> {
  if (ALWAYS_USABLE.has(file.type)) return true
  if (!file.type && USABLE_EXTENSION.test(file.name)) return true
  if (file.type && !file.type.startsWith('image/')) return false
  if (typeof createImageBitmap !== 'function') return false
  try {
    const bitmap = await createImageBitmap(file)
    bitmap.close?.()
    return true
  } catch {
    return false
  }
}

/** Splits the chosen files into the ones this browser can use and the rest. */
export async function sortChosenPhotos(files: File[]): Promise<{ usable: File[]; unusable: number }> {
  const checks = await Promise.all(files.map(isUsablePhoto))
  return {
    usable: files.filter((_, i) => checks[i]),
    unusable: checks.filter((ok) => !ok).length,
  }
}

/**
 * What to tell the person after choosing photos, or null when every photo
 * was added. `room` is how many more photos fit before the maximum.
 */
export function photoIntakeNotice({
  chosen,
  unusable,
  room,
  max,
}: {
  chosen: number
  unusable: number
  room: number
  max: number
}): string | null {
  const usable = chosen - unusable
  const parts: string[] = []

  if (unusable > 0) {
    if (usable === 0 && chosen === 1) {
      parts.push('Esta foto no se puede usar. Elige otra foto.')
    } else if (usable === 0) {
      parts.push('Estas fotos no se pueden usar. Elige otras fotos.')
    } else if (unusable === 1) {
      parts.push('1 foto no se puede usar y no la agregamos. Elige otra foto.')
    } else {
      parts.push(`${unusable} fotos no se pueden usar y no las agregamos. Elige otras fotos.`)
    }
  }

  if (usable > room) {
    if (room === 0) parts.push(`Ya tienes el máximo de ${max} fotos.`)
    else if (room === 1) parts.push('Solo cabía 1 foto más; agregamos la primera.')
    else parts.push(`Solo cabían ${room} fotos más; agregamos las primeras ${room}.`)
  }

  return parts.length > 0 ? parts.join(' ') : null
}
