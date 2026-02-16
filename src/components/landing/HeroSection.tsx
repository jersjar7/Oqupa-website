import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import heroImage from '@/assets/images/hero-Piura-family-home.webp'

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLElement | null>
}

export default function HeroSection({ heroRef }: HeroSectionProps) {
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
      ref={heroRef}
      className="relative min-h-screen bg-cream overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 pb-16 lg:pt-36 lg:pb-24">
        <div
          ref={ref}
          className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Text Column */}
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-text-primary animate-pulse-badge">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Proximamente 2026
            </span>

            <h1 className="font-serif text-4xl font-normal leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Todas las propiedades de Piura, en un solo lugar confiable.
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-text-secondary">
              Oqupa centraliza los avisos, elimina fraudes y te conecta directo
              con propietarios y agentes verificados.
            </p>

            <a
              href="#lista-espera"
              onClick={handleScrollToWaitlist}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5 sm:w-auto sm:px-8 sm:text-lg"
            >
              Lista de Espera
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

          {/* Image Column */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-lg lg:max-w-none">
              <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />
              <img
                src={heroImage}
                alt="Familia buscando su hogar ideal en Piura con Oqupa"
                className="relative w-full rounded-2xl object-cover shadow-large"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2 animate-scroll-indicator">
          <span className="text-xs font-medium text-text-secondary">
            Descubre mas
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}
