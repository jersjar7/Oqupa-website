import { z } from 'zod'

export const realtorApplicationSchema = z.object({
  businessName: z
    .string()
    .max(100, 'El nombre del negocio es demasiado largo')
    .optional()
    .or(z.literal('')),
  yearsExperience: z
    .number({ message: 'Ingresa un número válido' })
    .int('Debe ser un número entero')
    .min(0, 'No puede ser negativo')
    .max(50, 'El valor parece incorrecto'),
  serviceZones: z
    .string()
    .min(1, 'Ingresa al menos una zona de servicio'),
  motivation: z
    .string()
    .min(20, 'Por favor, proporciona más detalles (mínimo 20 caracteres)')
    .max(500, 'La motivación es demasiado larga (máximo 500 caracteres)'),
})

export type RealtorApplicationFormData = z.infer<typeof realtorApplicationSchema>
