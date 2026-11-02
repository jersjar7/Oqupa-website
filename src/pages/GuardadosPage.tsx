// A visitor's Guardados: what they saved in this browser (Guardados sin
// cuenta, Jerson 2026-10-25). Someone signed in has theirs in the account.
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'
import { isAccountReady } from '@/lib/accountReady'
import { useListListings } from '@/hooks/useListListings'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import ListingListCard from '@/components/explore/list/ListingListCard'

export default function GuardadosPage() {
  const firebaseUser = useAuthStore((s) => isAccountReady(s.firebaseUser, s.user))
  const ids = useDeviceSavesStore((s) => s.ids)
  const clear = useDeviceSavesStore((s) => s.clear)
  const { items, isLoading, missingIds, failedIds, retry } = useListListings(firebaseUser ? [] : ids)
  // How many saves were dropped because the listing is gone, said once.
  const [removedCount, setRemovedCount] = useState(0)
  const couldNotLoad = !isLoading && items.length === 0 && (failedIds?.length ?? 0) > 0
  // A saved listing that no longer exists leaves the saves, so the page is
  // never blank with no way out (hostile review 2026-10-25).
  const missingKey = (missingIds ?? []).join(',')
  useEffect(() => {
    if (missingIds && missingIds.length > 0) {
      clear(missingIds)
      setRemovedCount((n) => n + missingIds.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey])
  useDocumentMeta({ title: 'Guardados - Oqupa', description: 'Tus propiedades guardadas en Oqupa.', url: `${window.location.origin}/guardados` })

  if (firebaseUser) return <Navigate to="/app/lists" replace />

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
      <h1 className="font-serif text-[28px] font-normal text-text-primary">Guardados</h1>
      {removedCount > 0 && (
        <p role="status" className="mt-3 text-sm text-text-secondary">
          {removedCount === 1
            ? 'Quitamos 1 propiedad que ya no está disponible.'
            : `Quitamos ${removedCount} propiedades que ya no están disponibles.`}
        </p>
      )}
      {couldNotLoad ? (
        // Offline or an error: the saves are still here (re-review).
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-base text-text-secondary">Sin conexión. Revisa tu internet y vuelve a intentarlo.</p>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-full border-[1.5px] border-secondary px-6 font-sans text-sm font-bold uppercase tracking-[1px] text-secondary"
          >
            Reintentar
          </button>
        </div>
      ) : ids.length === 0 || (!isLoading && items.length === 0) ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-base text-text-secondary">Aún no tienes guardados.</p>
          <Link to="/explorar" className="rounded-full bg-primary px-6 py-3 font-sans text-sm font-bold uppercase tracking-[1px] text-white hover:bg-primary-hover">
            Explorar
          </Link>
        </div>
      ) : isLoading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {items.map((item) => (
            <ListingListCard key={item.listing.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
