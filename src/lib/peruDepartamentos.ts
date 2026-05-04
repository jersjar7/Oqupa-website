// Peru's 24 departamentos + Callao (constitutional province), excluding
// Piura (the launch market). Used by the expansion-interest form so users in
// other regions can ask us to bring Oqupa to their departamento.
export const PERU_DEPARTAMENTOS_EXCEPT_PIURA = [
  'Amazonas',
  'Áncash',
  'Apurímac',
  'Arequipa',
  'Ayacucho',
  'Cajamarca',
  'Callao',
  'Cusco',
  'Huancavelica',
  'Huánuco',
  'Ica',
  'Junín',
  'La Libertad',
  'Lambayeque',
  'Lima',
  'Loreto',
  'Madre de Dios',
  'Moquegua',
  'Pasco',
  'Puno',
  'San Martín',
  'Tacna',
  'Tumbes',
  'Ucayali',
] as const

export type PeruDepartamento = (typeof PERU_DEPARTAMENTOS_EXCEPT_PIURA)[number]
