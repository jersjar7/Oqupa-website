export interface RealtorClaim {
  id: string
  listingId: string
  realtorId: string
  listingOwnerId: string
  claimedAt: Date
  claimMonth: string // "YYYY-MM"
  realtorName: string
  realtorPhone: string
  realtorBusinessName: string
  ownerContacted: boolean
  assignedByOwner: boolean
}
