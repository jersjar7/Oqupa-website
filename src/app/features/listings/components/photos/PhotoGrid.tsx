import { useRef } from 'react'
import { ImagePlus } from 'lucide-react'
import PhotoTile from './PhotoTile'
import { MAX_PHOTOS, type PhotoItem } from './usePhotoQueue'

interface PhotoGridProps {
  items: PhotoItem[]
  previewUrls: Map<File, string>
  onAddFiles: (files: File[]) => void
  onRemove: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  photoError: string | null
  minPhotos: number
}

/**
 * The photos (ADR-043 D8): one AGREGAR FOTOS button, the minimum in view from
 * the start, and a tap on a photo makes it the cover — no dragging.
 */
export default function PhotoGrid({
  items,
  previewUrls,
  onAddFiles,
  onRemove,
  onReorder,
  photoError,
  minPhotos,
}: PhotoGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const full = items.length >= MAX_PHOTOS

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    onAddFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <p className="text-base text-text-secondary">
        {minPhotos === 1 ? 'Mínimo 1 foto' : `Mínimo ${minPhotos} fotos`}
      </p>
      {items.length > 1 && <p className="mt-1 text-base text-text-secondary">Tocar para hacer portada</p>}
      {photoError && <p data-wizard-error className="mt-1 text-sm text-error">{photoError}</p>}

      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item, i) => (
            <PhotoTile
              key={item.id}
              item={item}
              index={i}
              previewUrls={previewUrls}
              onRemove={onRemove}
              onMakeCover={() => onReorder(i, 0)}
            />
          ))}
        </div>
      )}

      {full ? (
        <p className="mt-3 text-base text-text-secondary">Máximo {MAX_PHOTOS} fotos</p>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-secondary font-sans text-base font-bold uppercase tracking-[1px] text-secondary transition-colors hover:bg-secondary-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
        >
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
          Agregar fotos
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
