import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'

const PRICING_FEATURES = [
  {
    title: 'Sin costos ocultos',
    description:
      'Precio fijo y transparente por cada aviso publicado. Sin sorpresas ni comisiones adicionales.',
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
          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
        />
      </svg>
    ),
  },
  {
    title: 'Maxima visibilidad',
    description:
      'Tu propiedad sera vista por miles de personas buscando en Piura. Llega a mas interesados.',
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
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    ),
  },
  {
    title: 'Proceso simple',
    description:
      'Publica tu propiedad en minutos con nuestro proceso guiado. Sin complicaciones.',
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
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
] as const

export default function PricingSection() {
  const { ref, isVisible } = useAnimateOnScroll()

  const handleScrollToWaitlist = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const element = document.getElementById('lista-espera')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section
      id="precios"
      className="bg-gradient-to-b from-cream via-white to-cream py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`flex flex-col items-center transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Heading */}
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
              Publica tu propiedad con precios justos
            </h2>
            <p className="mt-4 font-sans font-medium uppercase tracking-wider text-secondary">
              En Oqupa creemos en la transparencia. Conoce nuestro modelo de
              precios simple y accesible para propietarios y agentes.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="mt-14 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRICING_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-light transition-shadow duration-300 hover:shadow-medium"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Price Callout */}
          <div className="mt-14 flex flex-col items-center gap-4 rounded-3xl border-2 border-primary/30 bg-white px-12 py-10 shadow-medium">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-primary sm:text-6xl">
                S/ 19
              </span>
              <span className="text-lg font-medium text-text-secondary">
                por aviso
              </span>
            </div>
            <p className="text-center text-sm text-text-secondary">
              Precio de lanzamiento. Publicacion activa por 30 dias.
            </p>
            <a
              href="#lista-espera"
              onClick={handleScrollToWaitlist}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5"
            >
              Conocer Mas
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
