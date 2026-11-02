import type { FieldValues, Resolver } from 'react-hook-form'
import { useListingFormStore } from '@/stores/listingFormStore'
import { AT_LEAST_ONE, LIMIT_MESSAGES } from '@/schemas/listingSchema'

/**
 * Editing a listing (hostile review #6): the limits introduced with the
 * wizard fixes apply only to fields the owner changes. A listing saved
 * before them (51 dormitorios, 2,000,000 m², 0 dormitorios from the app…)
 * must stay editable, or the owner could not even fix its price.
 */
const LIMITS = new Set<string>([
  LIMIT_MESSAGES.count,
  LIMIT_MESSAGES.area,
  LIMIT_MESSAGES.price,
  'El precio debe ser mayor a 0.',
  'El precio debe ser mayor a 0 (Paso 5)',
  ...Object.values(AT_LEAST_ONE).flatMap((m) => (m.bedroom ? [m.bedroom, m.bathroom] : [m.bathroom])),
])

/** True when editing and `field` still holds the value the listing was loaded with. */
function unchangedSinceLoad(field: string, value: unknown): boolean {
  const s = useListingFormStore.getState()
  if (!s.isEditMode || !s.editBaseline || !(field in s.editBaseline)) return false
  return Object.is((s.editBaseline as Record<string, unknown>)[field], value)
}

const waived = (field: string, message: string | undefined, values: Record<string, unknown>) =>
  message != null && LIMITS.has(message) && unchangedSinceLoad(field, values[field])

/** The check's complaints, minus limits on fields an edit left untouched. */
export function issuesThatCount<I extends { path: PropertyKey[]; message: string }>(
  issues: I[],
  values: Record<string, unknown>,
): I[] {
  return issues.filter((i) => !waived(String(i.path[0]), i.message, values))
}

/** A form resolver that lets an edit keep an older listing's out-of-limit values. */
export function editAwareResolver<T extends FieldValues>(resolver: Resolver<T>): Resolver<T> {
  return async (values, context, options) => {
    const result = await resolver(values, context, options)
    const errors = { ...(result.errors as Record<string, { message?: string } | undefined>) }
    let changed = false
    for (const [field, error] of Object.entries(errors)) {
      if (waived(field, error?.message, values as Record<string, unknown>)) {
        delete errors[field]
        changed = true
      }
    }
    if (!changed) return result
    if (Object.keys(errors).length > 0) return { values: {}, errors } as Awaited<ReturnType<Resolver<T>>>
    return { values, errors: {} } as Awaited<ReturnType<Resolver<T>>>
  }
}
