import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'

const TRUST_SIGNALS = [
  {
    title: 'Proceso de verificacion',
    description:
      'Cada aviso y cada usuario pasa por un proceso de validacion para asegurar que la informacion sea autentica y los contactos reales.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    title: 'Informacion completa',
    description:
      'Cada propiedad incluye fotos de calidad, descripcion detallada, ubicacion precisa y datos de contacto para que tomes decisiones informadas.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    title: 'Soporte personalizado',
    description:
      'Nuestro equipo esta disponible para ayudarte en cada paso, ya sea que busques o publiques una propiedad en Piura.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
] as const

export default function SocialProofSection() {
  const { ref, isVisible } = useAnimateOnScroll()

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Heading */}
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
            La plataforma que Piura necesita
          </h2>

          {/* Trust Signal Cards */}
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST_SIGNALS.map((signal) => (
              <div
                key={signal.title}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-8 shadow-light transition-shadow duration-300 hover:shadow-medium"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  {signal.icon}
                </div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {signal.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {signal.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
