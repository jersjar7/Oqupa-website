import type { RealtorApplicationStatus } from './enums'

export interface RealtorApplication {
  id: string
  userId: string
  fullName: string
  phone: string
  email: string
  businessName: string
  yearsExperience: number
  serviceZones: string[]
  motivation: string
  status: RealtorApplicationStatus
  submittedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
}
