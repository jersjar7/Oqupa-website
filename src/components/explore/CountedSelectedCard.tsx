// The card of the listing whose pin was chosen (phone sheet and computer
// pop-up). ADR-051: on screen it counts an Aparición; kept open 2 seconds it
// counts a Vista — the same as the app's pin card. The hover preview on a
// computer does not use this: the app has no hover, and both count alike.
import type { ReactNode } from 'react'
import { useCountSeenWhileOpen, useCountShownWhenVisible } from '@/hooks/useListingCounts'
import type { ListingWithProperty } from '@/types/explore'

export default function CountedSelectedCard({ item, children }: { item: ListingWithProperty; children: ReactNode }) {
  const ref = useCountShownWhenVisible(item.listing.id, item.listing.ownerId)
  useCountSeenWhileOpen(item.listing.id, item.listing.ownerId)
  return <div ref={ref}>{children}</div>
}
