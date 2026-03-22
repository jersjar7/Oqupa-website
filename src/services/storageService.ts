import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import imageCompression from 'browser-image-compression'
import { storage } from '@/lib/firebase'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
}

export const storageService = {
  async compressImage(file: File): Promise<File> {
    return imageCompression(file, COMPRESSION_OPTIONS)
  },

  async uploadPropertyPhoto(
    propertyId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const compressed = await this.compressImage(file)
    const filename = `${Date.now()}_${file.name}`
    const storageRef = ref(storage, `property-photos/${propertyId}/${filename}`)

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
  ): Promise<string[]> {
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
