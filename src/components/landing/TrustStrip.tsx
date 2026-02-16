import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'

const TRUST_CARDS = [
  {
    title: 'Avisos verificados',
    description:
      'Cada aviso pasa por un proceso de verificacion para garantizar informacion real y confiable.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-secondary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Cobertura completa en Piura',
    description:
      'Encontraras propiedades de toda la region, desde el centro hasta las zonas de expansion.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-secondary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Informacion transparente y confiable',
    description:
      'Datos claros, fotos reales y contacto directo con propietarios y agentes verificados.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-secondary"
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
] as const

export default function TrustStrip() {
  const { ref, isVisible } = useAnimateOnScroll()

  return (
    <section className="bg-background-secondary py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TRUST_CARDS.map((card, index) => (
            <div
              key={card.title}
              className={`flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-light transition-all duration-700 ease-out hover:shadow-medium ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
                {card.icon}
              </div>
              <h3 className="font-sans text-lg font-medium uppercase tracking-wider text-text-primary">
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
