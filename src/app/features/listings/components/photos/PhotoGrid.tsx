import { useRef } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { InfoTip } from '@/app/components/ui'
import PhotoTile from './PhotoTile'
import PhotoDropzone from './PhotoDropzone'
import { MAX_PHOTOS, type PhotoItem } from './usePhotoQueue'

interface PhotoGridProps {
  items: PhotoItem[]
  previewUrls: Map<File, string>
  onAddFiles: (files: File[]) => void
  onRemove: (index: number) => void
  onMove: (index: number, direction: -1 | 1) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  photoError: string | null
  canContinue: boolean
  minPhotos: number
}

export default function PhotoGrid({
  items,
  previewUrls,
  onAddFiles,
  onRemove,
  onMove,
  onReorder,
  photoError,
  canContinue,
  minPhotos,
}: PhotoGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    onAddFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = items.findIndex((it) => it.id === active.id)
    const toIndex = items.findIndex((it) => it.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    onReorder(fromIndex, toIndex)
  }

  const itemIds = items.map((i) => i.id)

  return (
    <div>
      <h3 className="text-sm font-medium uppercase text-text-primary">
        Fotos ({items.length}/{MAX_PHOTOS})
      </h3>
      <p className="mt-1 text-xs text-text-tertiary">
        La primera foto sera la portada de tu publicacion
        <InfoTip text="La portada es la primera imagen que ven los compradores en los resultados de búsqueda. Pon tu mejor foto primero." />
      </p>
      <p className="mt-1 text-xs text-text-tertiary sm:hidden">
        Mantén presionada una foto para reordenarla
      </p>
      {!canContinue && !photoError && (
        <p className="mt-1 text-xs text-text-tertiary">
          Sube al menos {minPhotos} fotos para continuar ({items.length}/{minPhotos})
        </p>
      )}
      {photoError && <p className="mt-1 text-sm text-error">{photoError}</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item, i) => (
              <PhotoTile
                key={item.id}
                item={item}
                index={i}
                total={items.length}
                previewUrls={previewUrls}
                onRemove={onRemove}
                onMove={onMove}
              />
            ))}
            {items.length < MAX_PHOTOS && (
              <PhotoDropzone
                variant="tile"
                onClick={() => fileInputRef.current?.click()}
              />
            )}
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {items.length === 0 && (
        <PhotoDropzone variant="empty" onClick={() => fileInputRef.current?.click()} />
      )}
    </div>
  )
}
