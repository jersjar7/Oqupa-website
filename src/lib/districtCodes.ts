// The 65 official districts of the departamento de Piura and their codes
// (ubigeo with "PE"), the same codes the server and the app use (ADR-058).
// Generated from src/app/features/analytics/data/piura-districts.json.

const DISTRICTS: Array<[string, string]> = [
  ['Amotape', 'PE200502'],
  ['Arenal', 'PE200503'],
  ['Ayabaca', 'PE200201'],
  ['Bellavista', 'PE200602'],
  ['Bellavista de la Unión', 'PE200802'],
  ['Bernal', 'PE200803'],
  ['Buenos Aires', 'PE200402'],
  ['Canchaque', 'PE200302'],
  ['Castilla', 'PE200104'],
  ['Catacaos', 'PE200105'],
  ['Chalaco', 'PE200403'],
  ['Chulucanas', 'PE200401'],
  ['Colán', 'PE200504'],
  ['Cristo Nos Valga', 'PE200804'],
  ['Cura Mori', 'PE200107'],
  ['El Alto', 'PE200702'],
  ['El Carmen de la Frontera', 'PE200303'],
  ['El Tallán', 'PE200108'],
  ['Frías', 'PE200202'],
  ['Huancabamba', 'PE200301'],
  ['Huarmaca', 'PE200304'],
  ['Ignacio Escudero', 'PE200603'],
  ['Jililí', 'PE200203'],
  ['La Arena', 'PE200109'],
  ['La Brea', 'PE200703'],
  ['La Huaca', 'PE200505'],
  ['La Matanza', 'PE200404'],
  ['La Unión', 'PE200110'],
  ['Lagunas', 'PE200204'],
  ['Lalaquiz', 'PE200305'],
  ['Lancones', 'PE200604'],
  ['Las Lomas', 'PE200111'],
  ['Lobitos', 'PE200704'],
  ['Los Órganos', 'PE200705'],
  ['Marcavelica', 'PE200605'],
  ['Miguel Checa', 'PE200606'],
  ['Montero', 'PE200205'],
  ['Morropón', 'PE200405'],
  ['Máncora', 'PE200706'],
  ['Pacaipampa', 'PE200206'],
  ['Paimas', 'PE200207'],
  ['Paita', 'PE200501'],
  ['Pariñas (Talara)', 'PE200701'],
  ['Piura', 'PE200101'],
  ['Querecotillo', 'PE200607'],
  ['Rinconada Llicuar', 'PE200806'],
  ['Salitral', 'PE200406'],
  ['Salitral', 'PE200608'],
  ['San Juan de Bigote', 'PE200407'],
  ['San Miguel de El Faique', 'PE200306'],
  ['Santa Catalina de Mossa', 'PE200408'],
  ['Santo Domingo', 'PE200409'],
  ['Sapillica', 'PE200208'],
  ['Sechura', 'PE200801'],
  ['Sicchez', 'PE200209'],
  ['Sondorillo', 'PE200308'],
  ['Sullana', 'PE200601'],
  ['Suyo', 'PE200210'],
  ['Sóndor', 'PE200307'],
  ['Tamarindo', 'PE200506'],
  ['Tambogrande', 'PE200114'],
  ['Veintiséis de Octubre', 'PE200115'],
  ['Vice', 'PE200805'],
  ['Vichayal', 'PE200507'],
  ['Yamango', 'PE200410'],
]

const key = (s: string) => s.normalize('NFD').replace(/\p{Mn}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ')

const BY_KEY = new Map(DISTRICTS.map(([name, code]) => [key(name), code]))
// Other ways the same districts are written on listings.
BY_KEY.set(key('26 de Octubre'), 'PE200115')
BY_KEY.set(key('Veintiseis de Octubre'), 'PE200115')
BY_KEY.set(key('Tambo Grande'), 'PE200114')
BY_KEY.set(key('Talara'), 'PE200701')
BY_KEY.set(key('Pariñas'), 'PE200701')

/** The district code for a district name as listings write it, or null. Salitral exists twice: left out. */
export function districtCodeOf(name: string | null | undefined): string | null {
  if (!name) return null
  const k = key(name)
  if (k === 'salitral') return null
  return BY_KEY.get(k) ?? null
}
