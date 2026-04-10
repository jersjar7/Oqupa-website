import { Link } from 'react-router-dom'
import { Plus, Briefcase } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUserListingsWithProperties } from '@/hooks/useListings'
import { useAgentAssignments, useAcceptAssignment, useDeclineAssignment } from '@/hooks/useRealtorLeads'
import { Button, Badge, Spinner } from '@/app/components/ui'
import ListingCard from '../components/ListingCard'
import ListingCardSkeleton from '../components/ListingCardSkeleton'
import EmptyState from '../components/EmptyState'
import AgentAssignmentCard from '../components/AgentAssignmentCard'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: items, isLoading, error } = useUserListingsWithProperties(user?.id)
  const isVerifiedRealtor = user?.isVerifiedRealtor
  const agentAssignments = useAgentAssignments(isVerifiedRealtor ? user?.id : undefined)
  const acceptAssignment = useAcceptAssignment()
  const declineAssignment = useDeclineAssignment()

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

      {/* Agent Assignments Section */}
      {isVerifiedRealtor && agentAssignments.data && agentAssignments.data.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <h2 className="font-sans text-[22px] font-medium text-text-primary">
              Propiedades Asignadas
            </h2>
            <Badge variant="info">{agentAssignments.data.length}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Propiedades donde has sido seleccionado como agente
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {agentAssignments.data.map(({ listing, property }) => (
              <AgentAssignmentCard
                key={listing.id}
                listing={listing}
                property={property}
                onAccept={listing.assignmentStatus === 'pending_acceptance'
                  ? () => acceptAssignment.mutate(listing.id)
                  : undefined}
                onDecline={listing.assignmentStatus === 'pending_acceptance' && user
                  ? () => declineAssignment.mutate({
                      listingId: listing.id,
                      currentDeclinedIds: listing.declinedRealtorIds ?? [],
                      agentId: user.id,
                    })
                  : undefined}
                isAccepting={acceptAssignment.isPending}
                isDeclining={declineAssignment.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {isVerifiedRealtor && agentAssignments.isLoading && (
        <div className="mt-12 flex justify-center py-4">
          <Spinner size="md" />
        </div>
      )}
    </div>
  )
}
