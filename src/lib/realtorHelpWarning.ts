// What turning agent help off does to the agents, in the app's own words
// (oqupa realtor_help_disable_warning.dart — keep the two identical).
// Null when nobody is affected.

export function realtorHelpDisableWarning({
  assignmentStatus,
  claimsCount,
}: {
  assignmentStatus: 'pending_acceptance' | 'accepted' | null | undefined
  claimsCount: number
}): string | null {
  if (!assignmentStatus && claimsCount <= 0) return null

  if (assignmentStatus === 'pending_acceptance') {
    return 'Invitaste a un agente que aún no confirma. Si guardas este cambio, se cancelará la invitación y se le avisará.'
  }

  if (assignmentStatus === 'accepted') {
    // The assigned agent is also counted among the claims.
    const others = claimsCount - 1
    if (others > 0) {
      const othersPhrase = others === 1 ? 'otro agente está interesado' : `otros ${others} agentes están interesados`
      return `Un agente ya representa esta propiedad y ${othersPhrase} en trabajar contigo. Si guardas este cambio, se cancelará la asignación y se les avisará.`
    }
    return 'Un agente ya representa esta propiedad. Si guardas este cambio, se cancelará la asignación y se le avisará.'
  }

  if (claimsCount === 1) {
    return '1 agente está interesado en trabajar contigo. Si guardas este cambio, dejará de ver tu anuncio y se le avisará.'
  }
  return `${claimsCount} agentes están interesados en trabajar contigo. Si guardas este cambio, dejarán de ver tu anuncio y se les avisará.`
}
