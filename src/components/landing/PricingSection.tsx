import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'

const FREE_BENEFITS = [
  {
    title: 'Publica sin costo',
    description:
      'Publica tus propiedades de forma completamente gratuita. Sin tarifas, sin comisiones, sin sorpresas.',
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
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Maxima visibilidad',
    description:
      'Tu propiedad sera vista por miles de personas buscando en Piura. Llega a mas interesados sin gastar un sol.',
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
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
  },
  {
    title: 'Proceso simple',
    description:
      'Publica tu propiedad en minutos con nuestro proceso guiado. Sin complicaciones ni requisitos innecesarios.',
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
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
] as const

export default function PricingSection() {
  const { ref, isVisible } = useAnimateOnScroll()



  return (
    <section
      id="precios"
      className="bg-[#FFFAF5] py-20 lg:py-28"
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
            <h2 className="text-3xl font-medium leading-tight text-secondary sm:text-4xl">
              Publica tus propiedades gratis
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-secondary">
              En Oqupa creemos que publicar tu propiedad no deberia tener costo.
              Nuestro servicio es completamente gratuito para propietarios y
              agentes.
            </p>
          </div>

          {/* FREE Highlight Callout */}
          <div className="mt-12 flex flex-col items-center gap-3 rounded-3xl border-2 border-secondary bg-secondary/5 px-10 py-10 shadow-medium sm:px-16">
            <span className="rounded-full bg-primary px-5 py-1.5 text-sm font-bold uppercase tracking-wider text-white">
              Gratis
            </span>
            <span className="text-6xl font-extrabold text-secondary sm:text-7xl">
              S/0<sup className="text-3xl sm:text-4xl">.00</sup>
            </span>
            <p className="text-center text-base font-medium text-text-secondary">
              Sin costos ocultos. Sin comisiones. Sin limites.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="mt-14 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FREE_BENEFITS.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-center gap-4 rounded-2xl bg-[#FFFAF5] p-8 text-center shadow-light transition-all duration-700 ease-out hover:shadow-medium"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-medium uppercase text-secondary">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
        </div>
      </div>
    </section>
  )
}
