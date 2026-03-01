import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUserListings } from '@/hooks/useListings'
import { firestoreService } from '@/services/firestoreService'
import { Button } from '@/app/components/ui'
import ListingCard from '../components/ListingCard'
import ListingCardSkeleton from '../components/ListingCardSkeleton'
import EmptyState from '../components/EmptyState'
import type { Property } from '@/types/property'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: listings, isLoading, error } = useUserListings(user?.id)
  const [properties, setProperties] = useState<Record<string, Property>>({})
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [propertiesError, setPropertiesError] = useState(false)

  // Fetch properties for all listings
  useEffect(() => {
    if (!listings || listings.length === 0) return

    const propertyIds = [...new Set(listings.map((l) => l.propertyId))]
    const missingIds = propertyIds.filter((id) => !properties[id])

    if (missingIds.length === 0) return

    let cancelled = false
    setPropertiesLoading(true)
    setPropertiesError(false)

    Promise.all(
      missingIds.map((id) => firestoreService.getPropertyById(id))
    )
      .then((results) => {
        if (cancelled) return
        const newProperties = { ...properties }
        results.forEach((prop) => {
          if (prop) newProperties[prop.id] = prop
        })
        setProperties(newProperties)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Error fetching properties:', err)
        setPropertiesError(true)
      })
      .finally(() => {
        if (!cancelled) setPropertiesLoading(false)
      })

    return () => { cancelled = true }
  }, [listings]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = isLoading || propertiesLoading

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text-primary">
            Mis Publicaciones
          </h1>
          {user?.name && (
            <p className="mt-1 text-sm text-text-secondary">
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
      {loading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : error || propertiesError ? (
        <div className="mt-8 text-center">
          <p className="text-error">Error al cargar tus publicaciones</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-primary hover:text-primary-hover"
          >
            Reintentar
          </button>
        </div>
      ) : !listings || listings.length === 0 ? (
        <div className="mt-8">
          <EmptyState />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const property = properties[listing.propertyId]
            if (!property) return null
            return (
              <ListingCard
                key={listing.id}
                listing={listing}
                property={property}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
