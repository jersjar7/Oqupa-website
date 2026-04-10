import { z } from 'zod'

export const realtorApplicationSchema = z.object({
  businessName: z
    .string()
    .max(100, 'El nombre del negocio es demasiado largo')
    .optional()
    .or(z.literal('')),
  yearsExperience: z
    .number({ message: 'Ingresa un numero valido' })
    .int('Debe ser un numero entero')
    .min(0, 'No puede ser negativo')
    .max(50, 'El valor parece incorrecto'),
  serviceZones: z
    .string()
    .min(1, 'Ingresa al menos una zona de servicio'),
  motivation: z
    .string()
    .min(20, 'Por favor, proporciona mas detalles (minimo 20 caracteres)')
    .max(500, 'La motivacion es demasiado larga (maximo 500 caracteres)'),
})

export type RealtorApplicationFormData = z.infer<typeof realtorApplicationSchema>
