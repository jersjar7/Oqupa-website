import { useQuery } from '@tanstack/react-query'
import { firestoreService } from '@/services/firestoreService'

/**
 * Admin-only: count of realtor applications currently pending review.
 * Used on the Dashboard admin CTA card. Query only runs when `enabled`
 * (pass `caps.isAdmin && viewAs === 'self'` to avoid firing for
 * non-admins or admins in view-as mode).
 */
export function usePendingRealtorApplicationsCount(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'pendingRealtorApplications', 'count'],
    queryFn: async () => {
      const apps = await firestoreService.getAllRealtorApplications('pending')
      return apps.length
    },
    enabled,
    // Applications don't change minute-by-minute; refresh every 60s when
    // the tab is focused is plenty.
    staleTime: 60_000,
  })
}
