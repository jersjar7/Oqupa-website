import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useListStore } from '@/stores/listStore'
import { listService } from '@/services/listService'
import { useListListings } from '@/hooks/useListListings'
import { Spinner } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import PropertyCard from '@/components/explore/PropertyCard'

export default function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>()
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const lists = useListStore((s) => s.lists)
  const navigate = useNavigate()

  const list = lists.find((l) => l.id === listId)
  useSetPageMeta({ title: list?.name ?? 'Lista' })

  const { items, isLoading, missingIds = [], failedIds = [], retry } = useListListings(list?.listingIds ?? [])
  // Offline or a failed read: not an empty list (audit 2026-11-02).
  const couldNotLoad = !isLoading && items.length === 0 && failedIds.length > 0

  async function handleRemove(listingId: string) {
    if (!firebaseUser || !listId) return
    try {
      await listService.removeListing(firebaseUser.uid, listId, listingId)
      // The app's words (favorites_bloc).
      toast.success('Quitado de Guardados')
    } catch {
      toast.error('No se pudo quitar de Guardados. Vuelve a intentarlo.')
    }
  }

  if (!list) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="font-sans text-base text-text-secondary">Lista no encontrada.</p>
        <Link
          to="/app/lists"
          className="font-sans text-sm font-medium text-primary hover:underline"
        >
          Volver a mis listas
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/app/lists')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-background-secondary"
        >
          <ArrowLeft className="h-4 w-4 text-text-secondary" />
        </button>
        <h1 className="font-serif text-[28px] font-normal text-text-primary">{list.name}</h1>
        <span className="font-sans text-sm text-text-tertiary">
          · {list.listingIds.length}{' '}
          {list.listingIds.length === 1 ? 'propiedad' : 'propiedades'}
        </span>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : couldNotLoad ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <p className="font-sans text-base text-text-secondary">Sin conexión. Revisa tu internet y vuelve a intentarlo.</p>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-full border-[1.5px] border-secondary px-6 font-sans text-sm font-bold uppercase tracking-[1px] text-secondary"
          >
            Reintentar
          </button>
        </div>
      ) : items.length === 0 && missingIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <Heart className="mb-3 h-10 w-10 text-text-tertiary" />
          <p className="font-sans text-base text-text-secondary">Esta lista está vacía</p>
          <Link
            to="/explorar"
            className="mt-4 inline-flex items-center rounded-full bg-primary px-5 py-2 font-sans text-sm font-bold uppercase tracking-[1px] text-white transition-opacity hover:opacity-90"
          >
            Explorar propiedades
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.listing.id} className="relative">
              <PropertyCard item={item} />
              <button
                onClick={() => handleRemove(item.listing.id)}
                title="Quitar de la lista"
                aria-label="Quitar de la lista"
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 font-sans text-base font-bold leading-none text-white transition-colors hover:bg-error">
                  ×
                </span>
              </button>
            </div>
          ))}
          {/* Removed listings stay visible, as the app's stub, so a save never
              vanishes without a word (audit 2026-11-02). */}
          {missingIds.map((id) => (
            <div key={id} className="flex flex-col justify-between rounded-xl border border-border bg-surface-muted p-4">
              <p className="text-sm text-text-secondary">Esta propiedad ya no está disponible</p>
              <button
                type="button"
                onClick={() => handleRemove(id)}
                className="mt-3 min-h-11 self-start rounded-full border-[1.5px] border-error/50 px-4 font-sans text-xs font-bold uppercase tracking-[1px] text-error-strong"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
