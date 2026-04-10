import { useState } from 'react'
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import heroCover from '@/assets/images/hero-cover.webp'
import heroCoverMobile from '@/assets/images/hero-cover-mobile.webp'
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
          src={heroCoverMobile}
          alt="Propiedades en Piura"
          className="w-full lg:hidden"
          loading="eager"
        />
        <img
          src={heroCover}
          alt="Propiedades en Piura"
          className="hidden w-full lg:block"
          loading="eager"
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 top-20 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

        {/* Content overlay — headline only on mobile, headline + CTAs on desktop */}
        <div
          ref={ref}
          className={`absolute inset-0 top-20 flex items-center transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="font-serif font-normal leading-tight text-white drop-shadow-lg text-[28px] sm:text-[36px] md:text-[44px] lg:text-[clamp(36px,3.5vw,64px)]">
              Todas las Propiedades<br />
              de Piura, en un<br />
              Solo Lugar.
            </h1>

            {/* Date labels + CTAs — hidden on mobile/tablet, shown on lg+ */}
            <div className="mt-6 hidden gap-16 lg:flex lg:mt-8">
              <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                  <p className="text-[clamp(20px,1.8vw,30px)] font-sans font-medium uppercase text-accent drop-shadow">4 de Mayo</p>
                  <p className="font-sans font-normal text-[clamp(14px,1vw,18px)] text-white/80 drop-shadow">Publica tu propiedad</p>
                </div>
                <button
                  onClick={() => setShowPostModal(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-[clamp(32px,2.5vw,48px)] py-[clamp(12px,1vw,16px)] text-[clamp(14px,1.2vw,20px)] font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5 cursor-pointer"
                >
                  Publicar
                </button>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                  <p className="text-[clamp(20px,1.8vw,30px)] font-sans font-medium uppercase text-accent drop-shadow">11 de Mayo</p>
                  <p className="font-sans font-normal text-[clamp(14px,1vw,18px)] text-white/80 drop-shadow">Descarga la App</p>
                </div>
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center justify-center rounded-xl border-2 border-white px-[clamp(32px,2.5vw,48px)] py-[clamp(12px,1vw,16px)] text-[clamp(14px,1.2vw,20px)] font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-white hover:text-secondary hover:shadow-large hover:-translate-y-0.5 cursor-pointer"
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date labels + CTAs — mobile + tablet, below the image */}
      <div className="flex justify-center gap-8 bg-[#FFFAF5] px-4 py-10 lg:hidden">
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-xl font-sans font-medium uppercase text-accent">4 de Mayo</p>
            <p className="font-sans font-normal text-base text-text-secondary">Publica tu propiedad</p>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-lg font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover cursor-pointer"
          >
            Publicar
          </button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-xl font-sans font-medium uppercase text-accent">11 de Mayo</p>
            <p className="font-sans font-normal text-base text-text-secondary">Descarga la App</p>
          </div>
          <button
            onClick={() => setShowSearchModal(true)}
            className="inline-flex items-center justify-center rounded-xl border-2 border-secondary px-8 py-3.5 text-lg font-bold uppercase tracking-wider text-secondary shadow-medium transition-all duration-200 hover:bg-secondary hover:text-white cursor-pointer"
          >
            Buscar
          </button>
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
