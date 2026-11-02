import { card as cardUrl } from '@/lib/imageUrl'
import { X } from 'lucide-react'
import type { PhotoItem } from './usePhotoQueue'

interface PhotoTileProps {
  item: PhotoItem
  index: number
  previewUrls: Map<File, string>
  onRemove: (index: number) => void
  onMakeCover: () => void
}

/** One photo. Tapping it makes it the cover (ADR-043 D8); the × removes it. */
export default function PhotoTile({ item, index, previewUrls, onRemove, onMakeCover }: PhotoTileProps) {
  const src = item.type === 'existing' ? cardUrl(item.url) : previewUrls.get(item.file) ?? ''
  const isCover = index === 0
  const image = <img src={src} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />

  return (
    <div className={`relative h-32 overflow-hidden rounded-xl border bg-white ${isCover ? 'border-secondary ring-2 ring-secondary' : 'border-border'}`}>
      {isCover ? (
        image
      ) : (
        <button
          type="button"
          onClick={onMakeCover}
          aria-label={`Hacer portada la foto ${index + 1}`}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
        >
          {image}
        </button>
      )}

      {isCover && (
        <span className="absolute top-1.5 left-1.5 rounded bg-secondary px-2 py-0.5 text-xs font-bold uppercase tracking-[1px] text-white">
          Portada
        </span>
      )}

      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label={`Eliminar foto ${index + 1}`}
        className="absolute top-0 right-0 flex h-12 w-12 items-center justify-center"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
          <X className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
    </div>
  )
}
