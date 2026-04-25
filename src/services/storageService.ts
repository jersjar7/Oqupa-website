import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import imageCompression from 'browser-image-compression'
import { storage, functions } from '@/lib/firebase'
import { generateBlurHash } from '@/lib/blurhash'

// browser-image-compression spawns a Web Worker that calls
// `self.importScripts(libURL)` to load the real implementation. The library's
// default `libURL` is hardcoded to `https://cdn.jsdelivr.net/npm/browser-image-compression@<ver>/dist/browser-image-compression.js`,
// which is why `firebase.json`'s CSP allow-lists `https://cdn.jsdelivr.net`
// in `script-src`.
//
// We attempted (chore/vite-build-hygiene, commit 153fe87) to self-host the
// worker script by passing `libURL: <vite-?url-import>` so the worker would
// importScripts a same-origin hashed asset under `script-src 'self'`. Static
// analysis looked clean (libURL flowed through, the asset emitted, dev server
// served it) but the deployed bundle's worker still failed to load the script
// at runtime — the CSP violation reported the jsdelivr URL, meaning the
// `libURL` option did not actually reach the worker context. Possible causes
// to investigate next time: (1) the inline blob worker is created from a
// stringified function literal that doesn't close over the option correctly
// in our minified bundle, (2) Vite's `?url` import resolves at build time
// to a path the worker cannot fetch under our CSP `worker-src 'self' blob:`
// constraint, (3) the library version we ship has different runtime semantics
// than the source we read.
//
// Don't retry the libURL bundling approach without first reproducing the
// exact failure on a deployed staging build (it works in dev — dev does not
// apply firebase.json CSP headers). Alternatives: drop `useWebWorker: true`
// and accept main-thread compression, or replace the library entirely.
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
}

export interface PhotoUploadResult {
  objectKey: string
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
    onProgress?: (progress: number) => void,
    presignedUpload?: { uploadUrl: string; objectKey: string }
  ): Promise<PhotoUploadResult> {
    const compressed = await this.compressImage(file)

    // Generate BlurHash from compressed image (runs in parallel with upload)
    const blurHashPromise = generateBlurHash(compressed)

    // Use presigned URL if provided, otherwise request one
    let uploadUrl: string
    let objectKey: string
    if (presignedUpload) {
      uploadUrl = presignedUpload.uploadUrl
      objectKey = presignedUpload.objectKey
    } else {
      const getUploadUrlFn = httpsCallable<
        { category: string; entityId: string; fileCount: number; contentType: string },
        { uploads: Array<{ uploadUrl: string; objectKey: string }> }
      >(functions, 'getUploadUrl')

      const { data: urlData } = await getUploadUrlFn({
        category: 'property',
        entityId: propertyId,
        fileCount: 1,
        contentType: compressed.type || 'image/webp',
      })
      uploadUrl = urlData.uploads[0]!.uploadUrl
      objectKey = urlData.uploads[0]!.objectKey
    }

    // Upload via XMLHttpRequest PUT for progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', compressed.type || 'image/webp')

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          onProgress?.(progress)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(compressed)
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

    return { objectKey, blurHash, microThumb }
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
    // Batch-request all presigned URLs in a single call
    const getUploadUrlFn = httpsCallable<
      { category: string; entityId: string; fileCount: number; contentType: string },
      { uploads: Array<{ uploadUrl: string; objectKey: string }> }
    >(functions, 'getUploadUrl')

    const { data: urlData } = await getUploadUrlFn({
      category: 'property',
      entityId: propertyId,
      fileCount: files.length,
      contentType: 'image/webp',
    })

    const progressPerFile = new Array<number>(files.length).fill(0)

    const uploads = files.map((file, i) =>
      this.uploadPropertyPhoto(propertyId, file, (progress) => {
        progressPerFile[i] = progress
        const overall = progressPerFile.reduce((a, b) => a + b, 0) / files.length
        onProgress?.(overall)
      }, urlData.uploads[i])
    )

    return Promise.all(uploads)
  },

  async deleteR2Photos(objectKeys: string[]): Promise<void> {
    if (objectKeys.length === 0) return
    const deleteFn = httpsCallable<
      { objectKeys: string[] },
      { deleted: number }
    >(functions, 'deleteR2Objects')
    await deleteFn({ objectKeys })
  },
}
