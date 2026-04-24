import { useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { InfoTip } from '@/app/components/ui'
import { card as cardUrl } from '@/lib/imageUrl'
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
  onMakeCover: (index: number) => void
  photoError: string | null
  canContinue: boolean
  minPhotos: number
}

function PhotoTilePreview({
  item,
  previewUrls,
  isCover,
}: {
  item: PhotoItem
  previewUrls: Map<File, string>
  isCover: boolean
}) {
  const src =
    item.type === 'existing' ? cardUrl(item.url) : previewUrls.get(item.file) ?? ''
  return (
    <div className="relative h-24 scale-105 overflow-hidden rounded-xl border border-border shadow-2xl ring-2 ring-primary/40">
      <img src={src} alt="" className="h-full w-full object-cover" />
      {isCover && (
        <span className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[1px] text-white">
          Portada
        </span>
      )}
    </div>
  )
}

export default function PhotoGrid({
  items,
  previewUrls,
  onAddFiles,
  onRemove,
  onMove,
  onReorder,
  onMakeCover,
  photoError,
  canContinue,
  minPhotos,
}: PhotoGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = items.findIndex((it) => it.id === active.id)
    const toIndex = items.findIndex((it) => it.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    onReorder(fromIndex, toIndex)
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  const itemIds = items.map((i) => i.id)
  const activeItem = activeId ? items.find((it) => it.id === activeId) ?? null : null

  const indexOf = (id: string | number) => items.findIndex((it) => it.id === id) + 1
  const total = items.length

  const screenReaderInstructions: ScreenReaderInstructions = {
    draggable:
      'Para recoger una foto, presiona Espacio o Enter. Mientras la cargas, usa las flechas para moverla. Presiona Espacio o Enter de nuevo para soltarla, o Escape para cancelar.',
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Recogiste la foto ${indexOf(active.id)} de ${total}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Foto ${indexOf(active.id)} sobre la posición ${indexOf(over.id)}.`
        : `Foto ${indexOf(active.id)} fuera de la cuadrícula.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Soltaste la foto ${indexOf(active.id)} en la posición ${indexOf(over.id)}.`
        : `Soltaste la foto ${indexOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Cancelaste el movimiento de la foto ${indexOf(active.id)}.`,
  }
  const activeIsCover = activeItem ? items[0]?.id === activeItem.id : false

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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{ announcements, screenReaderInstructions }}
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
                onMakeCover={onMakeCover}
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
        <DragOverlay>
          {activeItem ? (
            <PhotoTilePreview
              item={activeItem}
              previewUrls={previewUrls}
              isCover={activeIsCover}
            />
          ) : null}
        </DragOverlay>
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
