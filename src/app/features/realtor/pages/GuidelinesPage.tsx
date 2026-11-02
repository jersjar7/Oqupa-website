/**
 * Buenas prácticas — ported word for word from the app's
 * realtor_guidelines_page (ADR-046 #20). Linked from Oportunidades and from
 * Agentes interesados, as the app links it from its leads page.
 */
import { Info, ShieldCheck } from 'lucide-react'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'

const AGENT_TIPS: [string, string][] = [
  [
    'Firmen un acuerdo por escrito',
    'Antes de trabajar, acuerda comisiones y condiciones por escrito con el propietario y guarda tu propia copia. Si más adelante te quitan la asignación en la app, tu acuerdo firmado es tu respaldo.',
  ],
  ['Sé profesional y claro', 'Preséntate con transparencia y explica cómo puedes ayudar. La confianza cierra tratos.'],
  ['Contacta a tiempo', 'El primer agente en comunicarse suele tener ventaja. No dejes enfriar la oportunidad.'],
]

const OWNER_TIPS: [string, string][] = [
  ['Conversa antes de elegir', 'Habla con los agentes interesados y elige con quién te sientes cómodo antes de asignar.'],
  ['Deja todo por escrito', 'Acuerda comisiones y condiciones por escrito con el agente que elijas. Protege a ambas partes.'],
  ['Tú tienes el control', 'Puedes cambiar cuántos agentes aceptas o dejar de buscar agente cuando quieras.'],
]

function Tips({ heading, tips }: { heading: string; tips: [string, string][] }) {
  return (
    <section className="mt-8">
      <h2 className="font-sans text-sm font-medium uppercase tracking-wide text-secondary">{heading}</h2>
      <ul className="mt-4 space-y-4">
        {tips.map(([title, body]) => (
          <li key={title}>
            <p className="text-base text-text-primary">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function GuidelinesPage() {
  useSetPageMeta({ title: 'Buenas prácticas' })

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-base leading-relaxed text-text-secondary">
        Oqupa conecta a propietarios y agentes inmobiliarios. Estas son buenas prácticas para que tu experiencia sea segura y clara.
      </p>

      <div className="mt-6 flex gap-3 rounded-2xl border border-border bg-white p-4 shadow-light">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
        <div>
          <p className="font-medium text-text-primary">Oqupa solo los pone en contacto</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            Oqupa es el medio donde se conocen. El trato y sus resultados —buenos o malos— ocurren entre las personas. Oqupa no es parte del acuerdo ni se hace responsable de él.
          </p>
        </div>
      </div>

      <Tips heading="Para agentes" tips={AGENT_TIPS} />
      <Tips heading="Para propietarios" tips={OWNER_TIPS} />

      <div className="mt-8 flex gap-3 rounded-2xl border border-secondary/30 bg-secondary/5 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
        <div>
          <p className="font-medium text-text-primary">Tu seguridad primero</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            Toma tus propias precauciones al reunirte o compartir información. Ante cualquier duda, prioriza tu seguridad.
          </p>
        </div>
      </div>
    </div>
  )
}
