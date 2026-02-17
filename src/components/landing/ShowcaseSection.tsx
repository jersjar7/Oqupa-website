import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import macbookImage from '@/assets/images/macbook-ubiqa-interface.webp'
import iphoneImage from '@/assets/images/iphone-ubiqa-app.webp'
import familyImage from '@/assets/images/family-kitchen-laptop.webp'

const FEATURES = [
  {
    title: 'Busqueda inteligente',
    description:
      'Filtra por ubicacion, precio, tipo de propiedad y mas para encontrar exactamente lo que necesitas.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-secondary"
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
        className="h-6 w-6 text-secondary"
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
    title: 'Informacion completa',
    description:
      'Cada aviso incluye fotos, ubicacion exacta, caracteristicas y datos de contacto verificados.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-secondary"
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

  const handleScrollToWaitlist = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const element = document.getElementById('lista-espera')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section id="caracteristicas" className="bg-background-secondary py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Device Mockups Column */}
          <div className="relative flex items-center justify-center">
            {/* Lifestyle accent image */}
            <div className="absolute -top-6 -right-4 z-0 hidden w-40 overflow-hidden rounded-2xl opacity-60 lg:block">
              <img
                src={familyImage}
                alt="Familia usando laptop en su cocina"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Macbook */}
            <div className="relative z-10 w-full max-w-md lg:max-w-lg">
              <img
                src={macbookImage}
                alt="Interfaz de Oqupa en MacBook"
                className="w-full rounded-lg shadow-large"
                loading="lazy"
              />

              {/* iPhone overlapping */}
              <div className="absolute -bottom-6 -right-4 z-20 w-24 sm:w-32 lg:-right-8 lg:w-36">
                <img
                  src={iphoneImage}
                  alt="App de Oqupa en iPhone"
                  className="w-full rounded-2xl shadow-large"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Text Column */}
          <div className="flex flex-col gap-8">
            <h2 className="font-serif text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
              La nueva forma de encontrar propiedades llega pronto
            </h2>

            <p className="text-lg leading-relaxed text-text-secondary">
              Oqupa combina tecnologia moderna con un enfoque local para
              ofrecerte la mejor experiencia de busqueda de propiedades en Piura.
            </p>

            <div className="flex flex-col gap-6">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-sans font-medium text-text-primary">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="#lista-espera"
              onClick={handleScrollToWaitlist}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5 sm:w-auto sm:px-8 sm:text-lg"
            >
              Acceso Anticipado
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
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
