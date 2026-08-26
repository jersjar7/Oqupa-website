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
 * Copy notes, so these are not "improved" back:
 * - "Anunciar" is the concept word, "Agrega tu propiedad" is the button. A
 *   button repeating the headline's claim says nothing about what clicking
 *   does. See brand.md's glossary.
 * - The body used to end "...el mapa que la gente de Piura ya está mirando."
 *   It reads better and implies an audience we do not have (52 users, 257
 *   listing views all time), which constraints.md forbids. Same-day is a
 *   verified fact: listings are written straight to status 'active' with no
 *   moderation gate.
 * - "Sin límite de avisos" is verified too: no cap exists in the rules, the
 *   services or the functions, and one owner already holds 8 listings.
 * - The free claim is made exactly twice — headline and body. It had been made
 *   five times across nav, headline, body, a price lockup and an overlay.
 *
 * Store badges are Apple's and Google's official artwork. Apple's is 2.99:1 and
 * Google's 3.37:1, so equal heights make Play look ~13% wider; the heights below
 * are offset deliberately to match optical mass.
 *
 * KNOWN, deliberately not fixed here — both are shipped, site-wide components
 * and changing them is a design-system call, not a hero one:
 * - the primary button is white on #F47843, which measures 2.76:1 (fails AA);
 * - the logo wordmark is #FECD60 on cream, which measures 1.43:1.
 */

// Districts with LIVE listings on production, in count order: Castilla 24,
// Sullana 11, Piura 6, 26 de Octubre 5, Máncora 2, Miguel Checa 1. Nothing
// aspirational — a coverage claim we cannot back is what constraints.md rules
// out. Re-check against production before changing this list.
const DISTRICTS = [
  'Castilla',
  'Sullana',
  'Piura',
  '26 de Octubre',
  'Máncora',
  'Miguel Checa',
]

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

  const districtRow = (
    <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-1 lg:gap-x-3">
      {DISTRICTS.map((d, i) => (
        <li key={d} className="flex items-center gap-x-2.5 lg:gap-x-3">
          {i > 0 && (
            <span aria-hidden="true" className="text-border">
              ·
            </span>
          )}
          <span className="font-sans text-xs font-medium tracking-[0.6px] text-text-secondary lg:text-[13px]">
            {d}
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden bg-cream pt-20 lg:min-h-[820px]"
    >
      {/* ---------- Desktop atmosphere (lg+) ---------------------------------
          The browser is ATMOSPHERE, not a second subject. Sharp and at full
          strength it put a second map of the same city, at the same zoom, with
          the same pill language, right behind the phone — the bezel did all the
          separating and there was no depth. Its rent pills also put six more
          orange objects on the board than the CTA, so the button stopped owning
          the colour. It bleeds off the right AND the bottom, so the only edge
          in view is the top one, which is where a window should have one. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden lg:block"
      >
        <div className="absolute left-6 top-[96px] h-[724px] w-[1135px] max-w-none overflow-hidden rounded-t-xl border border-b-0 border-border bg-white opacity-[0.68] shadow-[0_24px_48px_rgba(28,28,30,0.07)]">
          <div className="flex h-[34px] items-center gap-2 border-b border-border bg-[#F6F1E8] px-3.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
            <span className="ml-3 flex h-[18px] w-60 items-center rounded-full border border-border bg-white px-2.5 text-[10px] text-text-secondary">
              oqupa.com
            </span>
          </div>
          <img
            src={webMap}
            alt=""
            className="block h-[690px] w-full object-cover object-left-top blur-[1.3px]"
            loading="lazy"
          />
        </div>

        {/* Whole, sharp, in front. Its bottom edge and the district row below
            the copy both land on y=798 so the two halves terminate together. */}
        <div className="absolute left-[344px] top-[210px] w-[280px] rounded-[36px] bg-text-primary p-2.5 shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)]">
          <img
            src={appMap}
            alt=""
            className="block h-[568px] w-full rounded-[28px] object-cover"
            loading="eager"
          />
        </div>
      </div>

      {/* ---------- Copy ---------------------------------------------------- */}
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col items-start pt-10 md:pt-14 lg:w-[620px] lg:pt-[132px]">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary sm:text-xs lg:text-[12.5px] lg:tracking-[0.16em]">
            Cualquier distrito, cualquier propiedad
          </span>

          {/* 64px at lg, not 68: at 68 the first line came within 49px of the
              artwork, which on 96px outer margins reads as a collision. */}
          <h1 className="mt-4 font-serif text-[38px] font-normal leading-[1.05] tracking-[-0.02em] text-text-primary sm:text-[40px] sm:leading-[1.06] lg:mt-6 lg:text-[64px] lg:leading-[1.02]">
            Anunciar en Piura
            <br />
            no cuesta nada.
          </h1>

          <p className="mt-4 max-w-[350px] font-sans text-[15.5px] leading-[1.5] text-text-secondary sm:max-w-[560px] sm:text-[17px] lg:mt-6 lg:text-[18.5px] lg:leading-[1.55]">
            Sin comisiones, sin tarifas, sin límite de avisos. Tu propiedad
            aparece en el mapa el mismo día.
          </p>

          <Link
            to="/app/listings/new"
            onClick={stashPublishReturn}
            className="mt-7 flex h-14 w-full items-center justify-center rounded-xl bg-primary font-sans text-[15px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_2px_6px_rgba(244,120,67,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover sm:w-[320px] lg:w-[302px]"
          >
            Agrega tu propiedad
          </Link>

          <div className="mt-9 flex flex-col items-start gap-3 lg:mt-12">
            <span className="font-sans text-[13px] font-medium text-text-primary lg:text-sm">
              El mapa de Piura, en tu teléfono
            </span>
            {storeBadges}
          </div>

          {/* The desktop board carries this signal with the browser window, so
              it would be a duplicate there. */}
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

          {/* The column's baseline element, and the only evidence on the page.
              The eyebrow claims coverage; this proves it with nouns — and
              "do you cover where my property is?" is the real question for a
              marketplace this size, not price, which is answered twice above. */}
          <div className="mt-8 lg:mt-14">{districtRow}</div>
        </div>
      </div>

      {/* ---------- Phone + tablet art (below lg) ---------------------------
          Below md the capture runs full-bleed with no device frame: drawing a
          phone inside a phone spent over a third of the viewport on a bezel the
          viewer is already holding, and the crop read as a failed image. At md
          there is room for a frame, and it matters — a phone screenshot shown
          768px wide renders the app's UI at roughly twice life size.

          It is a link because a photoreal, pin-dense, edge-to-edge map at the
          bottom of a phone viewport WILL be tapped. Static, it is a dead end on
          the board that carries most of the traffic. */}
      <Link
        to="/explorar"
        aria-label="Ver el mapa de propiedades en Piura"
        className="group mt-10 block lg:hidden"
      >
        <div className="relative mx-auto overflow-hidden rounded-t-2xl shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)] md:hidden">
          <img
            src={appMap}
            alt="El mapa de Oqupa con precios reales de propiedades en Piura"
            className="block h-[348px] w-full object-cover object-[center_30%]"
            loading="eager"
          />
          <span className="absolute right-5 top-3.5 rounded-[20px] bg-white px-[18px] py-2.5 font-sans text-xs font-bold uppercase tracking-[1px] text-text-primary shadow-[0_2px_6px_rgba(28,28,30,0.14),0_8px_20px_rgba(28,28,30,0.10)] transition-transform duration-200 group-hover:scale-[1.03]">
            Ver el mapa
          </span>
        </div>

        <div className="relative mx-auto hidden w-[400px] rounded-t-[48px] bg-text-primary px-3 pt-3 shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)] md:block lg:hidden">
          <img
            src={appMap}
            alt="El mapa de Oqupa con precios reales de propiedades en Piura"
            className="block h-[300px] w-full rounded-t-[37px] object-cover object-top"
            loading="eager"
          />
        </div>
      </Link>
    </section>
  )
}
