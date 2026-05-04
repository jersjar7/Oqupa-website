import { Link, useLocation } from 'react-router-dom'
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import { setReturnUrl } from '@/lib/utils'
import heroCover from '@/assets/images/hero-cover.webp'
import heroCoverMobile from '@/assets/images/hero-cover-mobile.webp'

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLElement | null>
}

export default function HeroSection({ heroRef }: HeroSectionProps) {
  const { ref, isVisible } = useAnimateOnScroll()
  const location = useLocation()

  // Anonymous visitors hitting "Publicar" land at /app/login (AuthGuard
  // redirect). We stash the intended destination so they bounce to the
  // listing wizard right after registering / signing in.
  const stashPublishReturn = () => setReturnUrl('/app/listings/new')

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

            {/* CTAs — hidden on mobile/tablet, shown on lg+ */}
            <div className="mt-8 hidden gap-6 lg:flex">
              <Link
                to="/app/listings/new"
                onClick={() => { stashPublishReturn(); setReturnUrl(location.pathname) }}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-[clamp(32px,2.5vw,48px)] py-[clamp(12px,1vw,16px)] text-[clamp(14px,1.2vw,20px)] font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large hover:-translate-y-0.5"
              >
                Publicar mi propiedad
              </Link>
              <Link
                to="/explorar"
                className="inline-flex items-center justify-center rounded-xl border-2 border-white px-[clamp(32px,2.5vw,48px)] py-[clamp(12px,1vw,16px)] text-[clamp(14px,1.2vw,20px)] font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-white hover:text-secondary hover:shadow-large hover:-translate-y-0.5"
              >
                Explorar Piura
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTAs — mobile + tablet, below the image */}
      <div className="flex flex-col items-center gap-3 bg-[#FFFAF5] px-4 py-10 sm:flex-row sm:justify-center sm:gap-4 lg:hidden">
        <Link
          to="/app/listings/new"
          onClick={stashPublishReturn}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover sm:w-auto"
        >
          Publicar mi propiedad
        </Link>
        <Link
          to="/explorar"
          className="inline-flex w-full items-center justify-center rounded-xl border-2 border-secondary px-8 py-3.5 text-base font-bold uppercase tracking-wider text-secondary shadow-medium transition-all duration-200 hover:bg-secondary hover:text-white sm:w-auto"
        >
          Explorar Piura
        </Link>
      </div>
    </section>
  )
}
