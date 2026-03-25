import { decode, encode } from 'blurhash'

/**
 * Converts a BlurHash string to a data URL for use as a CSS background image.
 * Returns undefined if the BlurHash is invalid or empty.
 */
export function blurHashToDataUrl(
  blurHash: string | undefined,
  width = 32,
  height = 32,
): string | undefined {
  if (!blurHash) return undefined

  try {
    const pixels = decode(blurHash, width, height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const imageData = ctx.createImageData(width, height)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL()
  } catch {
    return undefined
  }
}

/**
 * Generates a BlurHash string from an image File using canvas.
 * Used during photo upload to create instant placeholders.
 */
export async function generateBlurHash(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        // Draw to a small canvas for fast hashing
        const canvas = document.createElement('canvas')
        const size = 64
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve('')
          return
        }
        ctx.drawImage(img, 0, 0, size, size)
        const imageData = ctx.getImageData(0, 0, size, size)
        const hash = encode(imageData.data, size, size, 4, 3)
        resolve(hash)
      } catch {
        resolve('')
      }
    }
    img.onerror = () => resolve('')
    img.src = URL.createObjectURL(file)
  })
}
