import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import imageCompression from 'browser-image-compression'
import { storage } from '@/lib/firebase'
import { generateBlurHash } from '@/lib/blurhash'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
}

export interface PhotoUploadResult {
  url: string
  blurHash: string
  microThumb: string
}

export const storageService = {
  async compressImage(file: File): Promise<File> {
    return imageCompression(file, COMPRESSION_OPTIONS)
  },

  async uploadPropertyPhoto(
    propertyId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<PhotoUploadResult> {
    const compressed = await this.compressImage(file)

    // Generate BlurHash from compressed image (runs in parallel with upload)
    const blurHashPromise = generateBlurHash(compressed)

    const filename = `${Date.now()}_${file.name}`
    const storageRef = ref(storage, `property-photos/${propertyId}/${filename}`)

    const url = await new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, compressed)

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          onProgress?.(progress)
        },
        reject,
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(downloadUrl)
        }
      )
    })

    const blurHash = await blurHashPromise

    // Generate micro-thumbnail (50px base64 WebP) for Firestore embedding
    let microThumb = ''
    try {
      const microCanvas = document.createElement('canvas')
      const microCtx = microCanvas.getContext('2d')
      if (microCtx) {
        const img = await createImageBitmap(compressed)
        const scale = 50 / Math.max(img.width, img.height)
        microCanvas.width = Math.round(img.width * scale)
        microCanvas.height = Math.round(img.height * scale)
        microCtx.drawImage(img, 0, 0, microCanvas.width, microCanvas.height)
        const dataUrl = microCanvas.toDataURL('image/webp', 0.6)
        microThumb = dataUrl.split(',')[1] ?? ''
      }
    } catch {
      // Non-critical — empty string means no micro-thumbnail
    }

    return { url, blurHash, microThumb }
  },

  async uploadUserPhoto(
    userId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const compressed = await this.compressImage(file)
    const filename = `profile_${Date.now()}.${file.name.split('.').pop()}`
    const storageRef = ref(storage, `user-photos/${userId}/${filename}`)

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, compressed)

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          onProgress?.(progress)
        },
        reject,
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(url)
        }
      )
    })
  },

  async uploadMultiplePropertyPhotos(
    propertyId: string,
    files: File[],
    onProgress?: (overallProgress: number) => void
  ): Promise<PhotoUploadResult[]> {
    const progressPerFile = new Array<number>(files.length).fill(0)

    const uploads = files.map((file, i) =>
      this.uploadPropertyPhoto(propertyId, file, (progress) => {
        progressPerFile[i] = progress
        const overall = progressPerFile.reduce((a, b) => a + b, 0) / files.length
        onProgress?.(overall)
      })
    )

    return Promise.all(uploads)
  },
}
