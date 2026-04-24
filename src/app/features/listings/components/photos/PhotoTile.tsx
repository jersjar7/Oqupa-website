import { card as cardUrl } from '@/lib/imageUrl'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { PhotoItem } from './usePhotoQueue'

interface PhotoTileProps {
  item: PhotoItem
  index: number
  total: number
  previewUrls: Map<File, string>
  onRemove: (index: number) => void
  onMove: (index: number, direction: -1 | 1) => void
}

export default function PhotoTile({
  item,
  index,
  total,
  previewUrls,
  onRemove,
  onMove,
}: PhotoTileProps) {
  const src =
    item.type === 'existing' ? cardUrl(item.url) : previewUrls.get(item.file) ?? ''
  const isCover = index === 0
  const canMoveLeft = index > 0
  const canMoveRight = index < total - 1

  return (
    <div className="group relative h-24 overflow-hidden rounded-xl border border-border">
      <img src={src} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />

      {isCover && (
        <span className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[1px] text-white">
          Portada
        </span>
      )}

      {/* Desktop: hover overlay */}
      <div className="absolute inset-x-0 bottom-0 hidden items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-1 pt-3 pb-1 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
        <div className="flex gap-0.5">
          {canMoveLeft && (
            <button
              type="button"
              onClick={() => onMove(index, -1)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-text-primary transition-colors hover:bg-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {canMoveRight && (
            <button
              type="button"
              onClick={() => onMove(index, 1)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-text-primary transition-colors hover:bg-white"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Mobile: always visible */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-1 pt-3 pb-1 sm:hidden">
        <div className="flex gap-0.5">
          {canMoveLeft && (
            <button
              type="button"
              onClick={() => onMove(index, -1)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-text-primary"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {canMoveRight && (
            <button
              type="button"
              onClick={() => onMove(index, 1)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-text-primary"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
