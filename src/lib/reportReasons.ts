// The app's six reasons for "Reportar anuncio" (report_block_actions.dart).
export const REPORT_REASONS = [
  'Información incorrecta',
  'Fotos inapropiadas',
  'Spam o publicidad',
  'Propiedad no existe',
  'Precio engañoso',
  'Otro',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]
