// Agent help (ADR-043 D10). The number of agents a listing gets when the
// owner turns help on — written as maxRealtors AND quoted in the offer, so the
// words cannot drift from what is saved (Jerson, 2026-11-02). The app's twin
// is PropertyOwnerCard.agentsWhenTurnedOn — keep the two identical.
export const AGENTS_WHEN_TURNED_ON = 3

/** The offer shown before turning help on. Same words as the app. */
export function agentHelpOffer(isRental: boolean): string {
  return `Agentes verificados por Oqupa podrán ofrecerte ayuda para ${isRental ? 'alquilar' : 'vender'} tu propiedad. Hasta ${AGENTS_WHEN_TURNED_ON} agentes podrán contactarte y tú siempre eliges con quién trabajar. Oqupa no cobra comisiones por este servicio.`
}

/** Shown while help is on — the listing's own limit, what the server enforces. */
export function agentHelpOnLine(maxRealtors: number): string {
  return maxRealtors === 1
    ? 'Hasta 1 agente puede contactarte. Tú eliges con quién trabajar.'
    : `Hasta ${maxRealtors} agentes pueden contactarte. Tú eliges con quién trabajar.`
}
