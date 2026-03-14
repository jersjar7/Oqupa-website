import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUserListingsWithProperties } from '@/hooks/useListings'
import { Button } from '@/app/components/ui'
import ListingCard from '../components/ListingCard'
import ListingCardSkeleton from '../components/ListingCardSkeleton'
import EmptyState from '../components/EmptyState'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: items, isLoading, error } = useUserListingsWithProperties(user?.id)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-normal text-text-primary">
            Mis Publicaciones
          </h1>
          {user?.name && (
            <p className="mt-1 text-base text-text-secondary">
              Hola, {user.name}
            </p>
          )}
        </div>
        <Link to="/app/listings/new">
          <Button>
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Crear Publicacion</span>
            <span className="sm:hidden">Crear</span>
          </Button>
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8 text-center">
          <p className="text-error">Error al cargar tus publicaciones</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-base text-secondary hover:text-secondary-hover"
          >
            Reintentar
          </button>
        </div>
      ) : !items || items.length === 0 ? (
        <div className="mt-8">
          <EmptyState />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ listing, property }) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              property={property}
            />
          ))}
        </div>
      )}
    </div>
  )
}
