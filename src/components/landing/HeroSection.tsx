import { useState } from 'react'
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import heroCover from '@/assets/images/hero-cover.webp'
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
    <section ref={heroRef} className="relative overflow-hidden">
      {/* Full-bleed hero image with text overlay */}
      <div className="relative pt-20">
        <img
          src={heroCover}
          alt="Propiedades en Piura"
          className="w-full object-cover object-[75%_center] sm:object-center h-[280px] sm:h-[360px] lg:h-[420px]"
          loading="eager"
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 top-20 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

        {/* Content overlay */}
        <div
          ref={ref}
          className={`absolute inset-0 top-20 flex items-center transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="max-w-lg text-[28px] font-medium leading-tight text-white sm:text-[36px] lg:text-[44px] drop-shadow-lg">
              Todas las propiedades de Piura, en un solo lugar confiable.
            </h1>

            {/* Date labels + CTAs */}
            <div className="mt-6 flex gap-4 sm:gap-8 lg:mt-8">
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-base font-bold text-accent sm:text-lg drop-shadow">4 de Mayo</p>
                  <p className="text-xs text-white/80 sm:text-sm drop-shadow">Publica tu propiedad</p>
                </div>
                <button
                  onClick={() => setShowPostModal(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5 cursor-pointer sm:px-8 sm:py-4 sm:text-base"
                >
                  Publicar
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-base font-bold text-accent sm:text-lg drop-shadow">13 de Mayo</p>
                  <p className="text-xs text-white/80 sm:text-sm drop-shadow">Descarga la App</p>
                </div>
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center justify-center rounded-xl border-2 border-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-white hover:text-secondary hover:shadow-large hover:-translate-y-0.5 cursor-pointer sm:px-8 sm:py-4 sm:text-base"
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
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
