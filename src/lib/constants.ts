export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.oqupa.app'
export const APP_URL_SCHEME = 'oqupa://'
export const CONTACT_EMAIL = 'admin@oqupa.com'

export const PIURA_CENTER = { lat: -5.194, lng: -80.633 }
export const DEFAULT_ZOOM = 13
export const GOOGLE_MAP_ID = '3a311dfa26cb532d3fdff2dc'

export interface BoundaryLayerConfig {
  url: string
  label: string
  fillColor: string
  fillOpacity: number
  strokeColor: string
  strokeWeight: number
  zIndex: number
}

export const BOUNDARY_LAYERS: BoundaryLayerConfig[] = [
  {
    url: '/boundaries/departamento_piura.geojson',
    label: 'Departamento de Piura',
    fillColor: '#F47843',
    fillOpacity: 0.05,
    strokeColor: '#F47843',
    strokeWeight: 3,
    zIndex: 2,
  },
]
