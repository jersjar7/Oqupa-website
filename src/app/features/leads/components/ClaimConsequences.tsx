// What claiming means, in the app's words (claim_lead_confirmation_dialog):
// shown in both claim confirmations (audit 2026-11-02, section G).
export default function ClaimConsequences({ limit, remaining }: { limit: number; remaining: number }) {
  const after = Math.max(0, remaining - 1)
  const items = [
    'Recibirás el nombre y WhatsApp del propietario',
    `Usarás 1 de tus ${limit} oportunidades mensuales (te quedarán ${after})`,
    'El propietario verá tu perfil y decidirá si trabaja contigo',
    'Oqupa solo los pone en contacto. El trato y sus resultados son entre ustedes; Oqupa no es responsable.',
  ]
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-text-primary">Al reclamar:</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((text) => (
          <li key={text} className="flex gap-2 text-sm text-text-secondary">
            <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
