import { Link } from 'react-router-dom'
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import showcaseImage from '@/assets/images/Showcase-image.webp'

const FEATURES = [
  {
    title: 'Búsqueda inteligente',
    description:
      'Filtra por ubicación, precio, tipo de propiedad y más para encontrar exactamente lo que necesitas.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Mapa interactivo',
    description:
      'Explora propiedades directamente en el mapa y descubre opciones cerca de tus zonas preferidas.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    ),
  },
  {
    title: 'Información completa',
    description:
      'Cada aviso incluye fotos, ubicación exacta, características y datos de contacto verificados.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-primary"
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
] as const

export default function ShowcaseSection() {
  const { ref, isVisible } = useAnimateOnScroll()

  return (
    <section id="caracteristicas" className="bg-[#FFFAF5] pt-4 pb-8 lg:pt-8 lg:pb-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`grid grid-cols-1 items-stretch gap-8 lg:gap-12 lg:grid-cols-2 transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Image Column — below text on mobile, left on desktop */}
          <div className="order-last overflow-hidden rounded-2xl shadow-large lg:order-first">
            <img
              src={showcaseImage}
              alt="Oqupa showcase"
              className="h-full w-full rounded-2xl object-cover object-center"
              loading="lazy"
            />
          </div>

          {/* Text Column */}
          <div className="flex flex-col gap-8 rounded-2xl bg-secondary/5 p-6 sm:bg-transparent sm:p-0 sm:rounded-none">
            <h2 className="font-serif text-2xl font-bold leading-tight text-secondary sm:text-4xl">
              La Nueva Forma de Encontrar Propiedades en Piura
            </h2>

            <p className="text-lg leading-relaxed text-text-secondary">
              Oqupa combina tecnología moderna con un enfoque local para
              ofrecerte la mejor experiencia de búsqueda de propiedades en Piura.
            </p>

            <div className="flex flex-col gap-6">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-sans font-medium uppercase text-secondary">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/explorar"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5 sm:w-auto sm:px-8 sm:text-lg"
            >
              Explorar propiedades
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
