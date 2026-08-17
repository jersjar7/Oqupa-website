// Enums matching Firestore document values exactly
// These string values are stored in Firestore and must not be changed

export const PropertyType = {
  casa: 'casa',
  departamento: 'departamento',
  terreno: 'terreno',
  oficina: 'oficina',
  local: 'local',
  hospedaje: 'hospedaje',
  habitacion: 'habitacion',
} as const
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType]

export const OperationType = {
  venta: 'venta',
  alquiler: 'alquiler',
} as const
export type OperationType = (typeof OperationType)[keyof typeof OperationType]

export const RentalDurationType = {
  longTerm: 'longTerm',
  shortTerm: 'shortTerm',
} as const
export type RentalDurationType =
  (typeof RentalDurationType)[keyof typeof RentalDurationType]

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
  departamento: 'Apartamento',
  terreno: 'Terreno',
  oficina: 'Oficina',
  local: 'Local Comercial',
  hospedaje: 'Alojamiento',
  habitacion: 'Cuarto',
}

/** Abbreviated labels for compact contexts (branded card overlay). */
export const PROPERTY_TYPE_SHORT_LABELS: Record<PropertyType, string> = {
  casa: 'Casa',
  departamento: 'Apto.',
  terreno: 'Terreno',
  oficina: 'Oficina',
  local: 'Local',
  hospedaje: 'Aloja.',
  habitacion: 'Cuarto',
}

export const PROPERTY_TYPE_DESCRIPTIONS: Record<PropertyType, string> = {
  casa: 'Casa completa',
  departamento: 'Departamento o piso',
  terreno: 'Lote sin construir',
  oficina: 'Espacio de trabajo',
  local: 'Tienda o negocio',
  hospedaje: 'Hotel, hostal, casa vacacional, alquiler por días',
  habitacion: 'Cuarto en vivienda compartida',
}

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
}

export const RENTAL_DURATION_TYPE_LABELS: Record<RentalDurationType, string> = {
  longTerm: 'Largo plazo',
  shortTerm: 'Corto plazo',
}

export const RENTAL_DURATION_PRICE_SUFFIX: Record<RentalDurationType, string> = {
  longTerm: '/mes',
  shortTerm: '/noche',
}

/** Property types available for venta */
export const VENTA_PROPERTY_TYPES: PropertyType[] = [
  'casa', 'departamento', 'terreno', 'oficina', 'local',
]

/** Property types available for alquiler largo plazo */
export const ALQUILER_LONG_TERM_PROPERTY_TYPES: PropertyType[] = [
  'casa', 'departamento', 'terreno', 'oficina', 'local', 'habitacion',
]

/** Property types available for alquiler corto plazo */
export const ALQUILER_SHORT_TERM_PROPERTY_TYPES: PropertyType[] = [
  'casa', 'departamento', 'hospedaje', 'habitacion',
]

/** All property types available for alquiler (union of long + short term) */
export const ALQUILER_ALL_PROPERTY_TYPES: PropertyType[] = [
  'casa', 'departamento', 'terreno', 'oficina', 'local', 'hospedaje', 'habitacion',
]

/** Whether a property type can only be used with alquiler */
export const isAlquilerOnlyType = (type: PropertyType): boolean =>
  type === 'hospedaje' || type === 'habitacion'

/** Whether a property type has rooms (bedrooms) */
export const propertyTypeHasRooms = (type: PropertyType): boolean =>
  type === 'casa' || type === 'departamento' || type === 'hospedaje'

/** Whether a property type is a single room */
export const propertyTypeIsRoom = (type: PropertyType): boolean =>
  type === 'habitacion'

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
  realtor: 'Soy agente inmobiliario',
  relative: 'Represento al propietario',
}

export const CONTACT_TIME_SLOT_LABELS: Record<ContactTimeSlot, string> = {
  morning: 'Mañana (8AM - 12PM)',
  afternoon: 'Tarde (12PM - 6PM)',
  evening: 'Noche (6PM - 10PM)',
  anytime: 'Cualquier hora',
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PEN: 'S/.',
  USD: 'US$',
}
