import { Link } from 'react-router-dom'
import { setReturnUrl } from '@/lib/utils'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/appStoreLinks'
import appMap from '@/assets/images/hero-app-map.webp'
import webMap from '@/assets/images/hero-web-map.webp'
import appStoreBadge from '@/assets/badges/app-store-es.svg'
import googlePlayBadge from '@/assets/badges/google-play-es.svg'

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLElement | null>
}

/**
 * The hero carries the two things the paid ads lead with: anunciar is free
 * anywhere in Piura, and there is an app. Everything else is secondary.
 *
 * Copy notes, so nobody "improves" these back:
 * - "Anunciar" is the concept word, "Agrega tu propiedad" is the button. A
 *   button that repeats the headline's claim says nothing about what clicking
 *   does. See brand.md's glossary.
 * - The body used to end "...el mapa que la gente de Piura ya está mirando."
 *   It reads better and implies an audience we do not have yet, which
 *   constraints.md forbids. Same-day is a verified fact instead: listings are
 *   written straight to status 'active' with no moderation gate.
 * - The free claim is made exactly twice — headline and body. It was made five
 *   times across nav, headline, body, a price lockup and a screenshot overlay.
 *
 * Store badges are Apple's and Google's official artwork. Apple's badge is
 * 2.99:1 and Google's is 3.37:1, so equal heights make Play look ~13% wider;
 * the heights below are offset deliberately to match optical mass.
 */
export default function HeroSection({ heroRef }: HeroSectionProps) {
  // Anonymous visitors hitting the CTA land at /app/login (AuthGuard redirect).
  // Stash the destination so they bounce to the wizard after signing in.
  const stashPublishReturn = () => setReturnUrl('/app/listings/new')

  const storeBadges = (
    <div className="flex items-center gap-3">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Descárgalo en el App Store"
        className="transition-transform duration-200 hover:scale-[1.03]"
      >
        <img src={appStoreBadge} alt="Descárgalo en el App Store" className="h-10 w-auto" />
      </a>
      <a
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Disponible en Google Play"
        className="transition-transform duration-200 hover:scale-[1.03]"
      >
        <img src={googlePlayBadge} alt="Disponible en Google Play" className="h-9 w-auto" />
      </a>
    </div>
  )

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden bg-cream pt-20 lg:min-h-[820px]"
    >
      {/* ---------- Desktop diorama (lg+) ------------------------------------
          The window is the big object and bleeds off-canvas; the phone is the
          small object and is whole, in front. Reversing that polarity — a
          contained window behind a bleeding phone — is what made an earlier
          pass read as broken rather than layered. The window's own width
          (1135px) also pushes the "33 de 50 propiedades" counter off-screen. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden lg:block"
      >
        <div className="absolute left-6 top-[120px] w-[1135px] max-w-none overflow-hidden rounded-xl border border-border bg-white shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)]">
          <div className="flex h-[34px] items-center gap-2 border-b border-border bg-[#F6F1E8] px-3.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
            <span className="ml-3 flex h-[18px] w-60 items-center rounded-full border border-border bg-white px-2.5 text-[10px] text-text-tertiary">
              oqupa.com
            </span>
          </div>
          <img
            src={webMap}
            alt=""
            className="block h-[546px] w-full object-cover object-left"
            loading="lazy"
          />
        </div>

        <div className="absolute left-[312px] top-[148px] w-[312px] rounded-[40px] bg-text-primary p-2.5 shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)]">
          <img
            src={appMap}
            alt=""
            className="block h-[622px] w-full rounded-[31px] object-cover"
            loading="eager"
          />
        </div>
      </div>

      {/* ---------- Copy ---------------------------------------------------- */}
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col items-center pt-10 text-center md:pt-14 lg:w-[620px] lg:items-start lg:pt-[116px] lg:text-left">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary sm:text-xs lg:text-[12.5px] lg:tracking-[0.16em]">
            En cualquier distrito
          </span>

          <h1 className="mt-4 font-serif text-[38px] font-normal leading-[1.05] tracking-[-0.02em] text-text-primary sm:text-[46px] sm:leading-[1.06] lg:mt-7 lg:text-[68px] lg:leading-[1.02]">
            Anunciar en Piura
            <br />
            no cuesta nada.
          </h1>

          <p className="mt-4 max-w-[350px] font-sans text-[15.5px] leading-[1.5] text-text-secondary sm:max-w-[560px] sm:text-[17px] lg:mt-7 lg:text-[18.5px] lg:leading-[1.55]">
            Sin comisiones, sin tarifas, sin límite de avisos. Tu propiedad
            aparece en el mapa de Piura el mismo día.
          </p>

          <Link
            to="/app/listings/new"
            onClick={stashPublishReturn}
            className="mt-7 flex h-14 w-full items-center justify-center rounded-xl bg-primary font-sans text-[15px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_2px_6px_rgba(244,120,67,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover sm:w-[320px] lg:w-[302px]"
          >
            Agrega tu propiedad
          </Link>

          <div className="mt-9 flex flex-col items-center gap-3 lg:mt-14 lg:items-start">
            <span className="font-sans text-[13px] font-medium text-text-primary lg:text-sm">
              El mapa de Piura, en tu teléfono
            </span>
            {storeBadges}
          </div>

          {/* The desktop board carries this signal with the browser window
              instead, so it would be a duplicate there. */}
          <div className="mt-5 flex items-center gap-2 lg:hidden">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="text-text-secondary"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="M3 9.5h18" />
            </svg>
            <span className="font-sans text-xs text-text-secondary">
              También desde el navegador en oqupa.com
            </span>
          </div>
        </div>
      </div>

      {/* ---------- Phone + tablet art (below lg) ---------------------------
          Below md the capture runs full-bleed with no device frame: drawing a
          phone inside a phone spent over a third of the viewport on a bezel the
          viewer is already holding, and the crop read as a failed image. At md
          there is room for a frame, and it matters — a phone screenshot shown
          768px wide renders the app's UI at roughly twice life size. */}
      <div className="mt-10 lg:hidden">
        <div className="mx-auto overflow-hidden rounded-t-2xl shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)] md:hidden">
          <img
            src={appMap}
            alt="El mapa de Oqupa con precios reales de propiedades en Piura"
            className="block h-[348px] w-full object-cover object-[center_30%]"
            loading="eager"
          />
        </div>

        <div className="mx-auto hidden w-[400px] rounded-t-[50px] bg-text-primary px-3 pt-3 shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)] md:block lg:hidden">
          <img
            src={appMap}
            alt="El mapa de Oqupa con precios reales de propiedades en Piura"
            className="block h-[300px] w-full rounded-t-[39px] object-cover object-top"
            loading="eager"
          />
        </div>
      </div>
    </section>
  )
}
