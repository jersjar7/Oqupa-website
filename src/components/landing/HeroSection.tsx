import { useState } from 'react'
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import heroImage from '@/assets/images/hero-Piura-family-home.webp'
import PostPropertyModal from '@/components/landing/PostPropertyModal'
import SearchPropertyModal from '@/components/landing/SearchPropertyModal'

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLElement | null>
}

export default function HeroSection({ heroRef }: HeroSectionProps) {
  const { ref, isVisible } = useAnimateOnScroll()
  const [showPostModal, setShowPostModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)

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
            <h1 className="text-[32px] font-medium leading-tight text-secondary sm:text-[40px] lg:text-[48px]">
              Todas las propiedades de Piura, en un solo lugar confiable.
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-text-secondary">
              Oqupa centraliza los avisos, elimina fraudes y te conecta directo
              con propietarios y agentes verificados.
            </p>

            {/* Divider */}
            <div className="w-full max-w-lg border-t border-border" />

            {/* Date Labels + CTAs in two columns */}
            <div className="flex max-w-lg gap-4 sm:gap-6">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-lg font-bold text-primary">4 de Mayo</p>
                  <p className="text-sm text-text-secondary">Publica tu propiedad</p>
                </div>
                <button
                  onClick={() => setShowPostModal(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5"
                >
                  Publicar
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-lg font-bold text-primary">13 de Mayo</p>
                  <p className="text-sm text-text-secondary">Descarga la App</p>
                </div>
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center justify-center rounded-xl border-2 border-secondary px-8 py-4 text-base font-bold uppercase tracking-wider text-secondary shadow-medium transition-all duration-200 hover:bg-secondary hover:text-white hover:shadow-large hover:-translate-y-0.5"
                >
                  Buscar
                </button>
              </div>
            </div>
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

      {/* Modals */}
      <PostPropertyModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
      />
      <SearchPropertyModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </section>
  )
}
