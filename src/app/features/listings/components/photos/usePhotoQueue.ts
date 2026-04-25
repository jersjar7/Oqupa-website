import { useState, useCallback, useMemo, useRef } from 'react'

export type PhotoItem = { id: string } & (
  | { type: 'existing'; url: string; blurHash: string }
  | { type: 'new'; file: File }
)

export const MAX_PHOTOS = 25

export interface SubmitData {
  photos: File[]
  existingPhotoUrls: string[]
  existingPhotoBlurHashes: string[]
  photoOrder: Array<{ type: 'existing' | 'new'; index: number }>
}

interface InitialPhotos {
  existingPhotoUrls: string[]
  existingPhotoBlurHashes: string[]
  photos: File[]
}

export interface PhotoQueue {
  items: PhotoItem[]
  previewUrls: Map<File, string>
  addFiles: (files: File[]) => void
  remove: (index: number) => void
  reorder: (fromIndex: number, toIndex: number) => void
  toSubmitData: () => SubmitData
}

export function usePhotoQueue(initial: InitialPhotos): PhotoQueue {
  const counterRef = useRef(0)
  const nextId = useCallback(() => `photo-${counterRef.current++}`, [])

  const [items, setItems] = useState<PhotoItem[]>(() => {
    const existing: PhotoItem[] = initial.existingPhotoUrls.map((url, i) => ({
      id: `photo-${counterRef.current++}`,
      type: 'existing',
      url,
      blurHash: initial.existingPhotoBlurHashes[i] ?? '',
    }))
    const newPhotos: PhotoItem[] = initial.photos.map((file) => ({
      id: `photo-${counterRef.current++}`,
      type: 'new',
      file,
    }))
    return [...existing, ...newPhotos]
  })

  const addFiles = useCallback(
    (files: File[]) => {
      setItems((prev) => {
        const remaining = MAX_PHOTOS - prev.length
        const newItems: PhotoItem[] = files
          .slice(0, remaining)
          .map((file) => ({ id: nextId(), type: 'new' as const, file }))
        return [...prev, ...newItems]
      })
    },
    [nextId]
  )

  const remove = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      if (fromIndex === toIndex) return prev
      if (fromIndex < 0 || fromIndex >= prev.length) return prev
      if (toIndex < 0 || toIndex >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved!)
      return next
    })
  }, [])

  const previewUrls = useMemo(() => {
    const map = new Map<File, string>()
    for (const item of items) {
      if (item.type === 'new' && !map.has(item.file)) {
        map.set(item.file, URL.createObjectURL(item.file))
      }
    }
    return map
  }, [items])

  const toSubmitData = useCallback((): SubmitData => {
    const existingPhotoUrls: string[] = []
    const existingPhotoBlurHashes: string[] = []
    const photos: File[] = []
    const photoOrder: SubmitData['photoOrder'] = []
    for (const item of items) {
      if (item.type === 'existing') {
        photoOrder.push({ type: 'existing', index: existingPhotoUrls.length })
        existingPhotoUrls.push(item.url)
        existingPhotoBlurHashes.push(item.blurHash)
      } else {
        photoOrder.push({ type: 'new', index: photos.length })
        photos.push(item.file)
      }
    }
    return { photos, existingPhotoUrls, existingPhotoBlurHashes, photoOrder }
  }, [items])

  return {
    items,
    previewUrls,
    addFiles,
    remove,
    reorder,
    toSubmitData,
  }
}
