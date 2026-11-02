import { card as cardUrl } from '@/lib/imageUrl'
import type { PhotoItem } from './usePhotoQueue'

interface PhotoTileProps {
  item: PhotoItem
  index: number
  previewUrls: Map<File, string>
  onRemove: (index: number) => void
  onMakeCover: () => void
}

/**
 * One photo. Tapping the picture makes it the cover (ADR-043 D8). Removing is
 * its own row under the picture, never on it, so a tap meant for the cover
 * cannot remove the photo (hostile review 2026-11-02).
 */
export default function PhotoTile({ item, index, previewUrls, onRemove, onMakeCover }: PhotoTileProps) {
  const src = item.type === 'existing' ? cardUrl(item.url) : previewUrls.get(item.file) ?? ''
  const isCover = index === 0
  const image = <img src={src} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />

  return (
    <div className={`overflow-hidden rounded-xl border bg-white ${isCover ? 'border-secondary ring-2 ring-secondary' : 'border-border'}`}>
      <div data-photo-picture className="relative h-28">
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
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label={`Eliminar foto ${index + 1}`}
        className="flex h-12 w-full items-center justify-center border-t border-border font-sans text-sm font-bold uppercase tracking-[1px] text-text-secondary hover:text-error-strong"
      >
        Quitar
      </button>
    </div>
  )
}
