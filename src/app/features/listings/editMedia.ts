/**
 * The cover photo's blurred preview (`primaryPhotoMicroThumb`) after an edit.
 *
 * Only the cover has one stored, so it can be kept only while the cover stays
 * the same photo; a new upload brings its own. Any other existing photo moved
 * to the front has none to give — no preview is better than the old cover's.
 * Returns '' for "write none".
 */
export function coverMicroThumbOnEdit({
  photoOrder,
  existingPhotoUrls,
  newMicroThumbs,
  originalCoverKey,
  originalCoverMicroThumb,
}: {
  photoOrder: Array<{ type: 'existing' | 'new'; index: number }>
  existingPhotoUrls: string[]
  newMicroThumbs: string[]
  originalCoverKey: string | undefined
  originalCoverMicroThumb: string
}): string {
  // Without a recorded order the save writes existing photos first, then new.
  const cover =
    photoOrder[0] ??
    (existingPhotoUrls.length > 0
      ? { type: 'existing' as const, index: 0 }
      : { type: 'new' as const, index: 0 })

  if (cover.type === 'new') return newMicroThumbs[cover.index] ?? ''
  const key = existingPhotoUrls[cover.index]
  return key !== undefined && key === originalCoverKey ? originalCoverMicroThumb : ''
}
