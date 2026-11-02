// The signed-in Guardados (ADR-046 #1): one flat list, like the app — the
// saved properties directly, each with its heart (one tap un-saves). It reads
// the app's store, so a save on either shows on both.
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useFavoritesStore } from '@/stores/favoritesStore'
import { favoritesService } from '@/services/favoritesService'
import { useListListings } from '@/hooks/useListListings'
import { Spinner } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import PropertyCard from '@/components/explore/PropertyCard'

export default function AccountGuardadosPage() {
  // The panel's title says it once; no subtitle restating it (2026-10-25).
  useSetPageMeta({ title: 'Guardados' })

  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const ids = useFavoritesStore((s) => s.ids)
  const isLoadingIds = useFavoritesStore((s) => s.isLoading)
  const loadFailed = useFavoritesStore((s) => s.loadFailed)
  const { items, isLoading, missingIds = [], failedIds = [], retry } = useListListings(ids)
  // Offline or a failed read: not "nothing saved" (audit 2026-11-02).
  const couldNotLoad = !isLoading && items.length === 0 && failedIds.length > 0

  async function handleRemove(listingId: string) {
    if (!firebaseUser) return
    try {
      await favoritesService.remove(firebaseUser.uid, listingId)
      // The app's words (favorites_bloc).
      toast.success('Quitado de Guardados')
    } catch {
      toast.error('No se pudo quitar de Guardados. Vuelve a intentarlo.')
    }
  }

  if (!firebaseUser) return null

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-base text-text-secondary">No pudimos cargar tus guardados. Vuelve a intentarlo.</p>
        <button
          type="button"
          onClick={() => useFavoritesStore.getState().initialize(firebaseUser.uid)}
          className="mt-4 min-h-11 rounded-full border-[1.5px] border-secondary px-6 font-sans text-sm font-bold uppercase tracking-[1px] text-secondary"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (isLoadingIds || (isLoading && items.length === 0)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (couldNotLoad) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <p className="font-sans text-base text-text-secondary">Sin conexión. Revisa tu internet y vuelve a intentarlo.</p>
        <button
          type="button"
          onClick={retry}
          className="min-h-11 rounded-full border-[1.5px] border-secondary px-6 font-sans text-sm font-bold uppercase tracking-[1px] text-secondary"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (ids.length === 0 || (items.length === 0 && missingIds.length === 0)) {
    // One empty state on the app and the website (audit 2026-11-02, B.2).
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-4 py-20 text-center">
          <Heart className="mb-3 h-10 w-10 text-text-tertiary" />
          <p className="font-sans text-base text-text-secondary">Aún no tienes guardados</p>
          <p className="mt-1 font-sans text-sm text-text-tertiary">Toca el corazón en las propiedades que te gusten</p>
          <Link
            to="/explorar"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-sans text-sm font-bold uppercase tracking-[1px] text-white transition-opacity hover:opacity-90"
          >
            Ver el mapa
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <PropertyCard key={item.listing.id} item={item} />
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
    </div>
  )
}
