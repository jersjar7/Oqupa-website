// Enums matching Firestore document values exactly
// These string values are stored in Firestore and must not be changed

export const PropertyType = {
  casa: 'casa',
  departamento: 'departamento',
  terreno: 'terreno',
  oficina: 'oficina',
  local: 'local',
} as const
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType]

export const OperationType = {
  venta: 'venta',
  alquiler: 'alquiler',
} as const
export type OperationType = (typeof OperationType)[keyof typeof OperationType]

export const ListingStatus = {
  draft: 'draft',
  paymentPending: 'paymentPending',
  active: 'active',
  expired: 'expired',
  deactivated: 'deactivated',
  sold: 'sold',
  rented: 'rented',
} as const
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus]

export const ListingRole = {
  owner: 'owner',
  realtor: 'realtor',
  relative: 'relative',
} as const
export type ListingRole = (typeof ListingRole)[keyof typeof ListingRole]

export const Currency = {
  PEN: 'PEN',
  USD: 'USD',
} as const
export type Currency = (typeof Currency)[keyof typeof Currency]

export const ContactTimeSlot = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  anytime: 'anytime',
} as const
export type ContactTimeSlot =
  (typeof ContactTimeSlot)[keyof typeof ContactTimeSlot]

export const SupportedCountryCode = {
  peru: 'peru',
  unitedStates: 'unitedStates',
} as const
export type SupportedCountryCode =
  (typeof SupportedCountryCode)[keyof typeof SupportedCountryCode]

export const RealtorApplicationStatus = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const
export type RealtorApplicationStatus =
  (typeof RealtorApplicationStatus)[keyof typeof RealtorApplicationStatus]

export const PaymentStatus = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  refunded: 'refunded',
  expired: 'expired',
} as const
export type PaymentStatus =
  (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const PaymentProvider = {
  culqi: 'culqi',
} as const
export type PaymentProvider =
  (typeof PaymentProvider)[keyof typeof PaymentProvider]

export const PaymentMethod = {
  card: 'card',
  yape: 'yape',
  plin: 'plin',
  bankTransfer: 'bankTransfer',
} as const
export type PaymentMethod =
  (typeof PaymentMethod)[keyof typeof PaymentMethod]

// Display labels (Spanish)

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  terreno: 'Terreno',
  oficina: 'Oficina',
  local: 'Local Comercial',
}

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
}

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Borrador',
  paymentPending: 'Pago Pendiente',
  active: 'Activo',
  expired: 'Vencido',
  deactivated: 'Desactivado',
  sold: 'Vendido',
  rented: 'Alquilado',
}

export const LISTING_ROLE_LABELS: Record<ListingRole, string> = {
  owner: 'Soy el propietario',
  realtor: 'Soy corredor inmobiliario',
  relative: 'Represento al propietario',
}

export const CONTACT_TIME_SLOT_LABELS: Record<ContactTimeSlot, string> = {
  morning: 'Mañana (8AM - 12PM)',
  afternoon: 'Tarde (12PM - 6PM)',
  evening: 'Noche (6PM - 10PM)',
  anytime: 'Cualquier hora',
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PEN: 'S/',
  USD: 'US$',
}
