// A visitor's Guardados: what they saved in this browser (Guardados sin
// cuenta, Jerson 2026-10-25). Someone signed in has theirs in the account.
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'
import { useListListings } from '@/hooks/useListListings'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import ListingListCard from '@/components/explore/list/ListingListCard'

export default function GuardadosPage() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const ids = useDeviceSavesStore((s) => s.ids)
  const { items, isLoading } = useListListings(firebaseUser ? [] : ids)
  useDocumentMeta({ title: 'Guardados - Oqupa', description: 'Tus propiedades guardadas en Oqupa.', url: `${window.location.origin}/guardados` })

  if (firebaseUser) return <Navigate to="/app/lists" replace />

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
      <h1 className="font-serif text-[28px] font-normal text-text-primary">Guardados</h1>
      {ids.length === 0 ? (
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
