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
 *   moderation gate. "el mismo día" was dropped because its antecedent went
 *   with the audience clause, leaving it dangling; "Anuncias hoy" anchors it.
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
 *
 * Headline is Pacific green and the eyebrow orange by Jerson's call
 * (2026-08-26). Green measures 6.00:1 and is fine. The orange eyebrow measures
 * 2.66:1 at this size and fails AA — flagged to him, not silently overridden;
 * #C0501E holds the same look at 4.76:1 if it ever needs fixing.
 */

// The seven other provinces of the departamento de Piura — the headline already
// names Piura itself, so together they state the whole region. Deliberately NOT
// a listing count: read as geography it is simply true, where a partial list of
// towns implied stock we do not have in most of them. Two lines is fine; do not
// trim it back to the provinces with listings, that was a different row.
const DISTRICTS = [
  'Sullana',
  'Paita',
  'Talara',
  'Sechura',
  'Morropón',
  'Huancabamba',
  'Ayabaca',
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


  /**
   * The site as atmosphere behind the phone. Two layers with complementary
   * vertical masks rather than one flat opacity: a uniform fade lightens
   * everything EXCEPT a white UI box, which then reads as relatively MORE
   * prominent. The sharp layer survives only in the band above the phone, where
   * the property-type row proves "cualquier propiedad" in the product's own
   * words; below the handover it all melts to texture.
   */
  const browserWindow = (sharpPx: number, fadePx: number) => {
    const mask = (from: string, to: string) =>
      `linear-gradient(to bottom, ${from} 0px, ${from} ${sharpPx}px, ${to} ${fadePx}px)`
    return (
      <>
        <div className="flex h-[34px] items-center gap-2 border-b border-border bg-[#F6F1E8] px-3.5 opacity-85">
          <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
          <span className="ml-3 flex h-[18px] w-52 items-center rounded-full border border-border bg-white px-2.5 text-[10px] text-text-secondary">
            oqupa.com
          </span>
        </div>
        <div className="relative flex-1">
          <img
            src={webMap}
            alt=""
            className="absolute inset-0 block h-full w-full object-cover object-left-top opacity-80"
            style={{ maskImage: mask('#000', 'transparent'), WebkitMaskImage: mask('#000', 'transparent') }}
            loading="lazy"
          />
          <img
            src={webMap}
            alt=""
            className="absolute inset-0 block h-full w-full object-cover object-left-top opacity-[0.42] blur-[3.5px]"
            style={{ maskImage: mask('transparent', '#000'), WebkitMaskImage: mask('transparent', '#000') }}
            loading="lazy"
          />
        </div>
      </>
    )
  }

  const phoneFrame = (className: string, imgClass: string) => (
    <div className={className}>
      <img src={appMap} alt="" className={imgClass} loading="eager" />
    </div>
  )

  const districtRow = (
    <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-1 xl:gap-x-3">
      {DISTRICTS.map((d, i) => (
        <li key={d} className="flex items-center gap-x-2.5 xl:gap-x-3">
          {i > 0 && (
            <span aria-hidden="true" className="text-border">
              ·
            </span>
          )}
          <span className="font-sans text-xs font-medium tracking-[0.6px] text-text-secondary xl:text-[13px]">
            {d}
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden bg-cream pt-20 xl:min-h-[820px]"
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
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden xl:block"
      >
        <div className="absolute left-6 top-[96px] h-[724px] w-[1135px] max-w-none overflow-hidden rounded-t-xl border border-b-0 border-border bg-white shadow-[0_24px_48px_rgba(28,28,30,0.07)]">
          <div className="relative z-10 flex h-[34px] items-center gap-2 border-b border-border bg-[#F6F1E8] px-3.5 opacity-85">
            <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#DED6C8]" />
            <span className="ml-3 flex h-[18px] w-60 items-center rounded-full border border-border bg-white px-2.5 text-[10px] text-text-secondary">
              oqupa.com
            </span>
          </div>
          {/* Two layers with complementary vertical masks, not one flat
              opacity. A uniform fade lightened everything EXCEPT Google's white
              "Map | Satellite" box, which became relatively MORE prominent —
              fading the surround is what promotes a white object. The sharp
              layer survives only in the band above the phone, where the
              property-type row proves "cualquier propiedad" in the product's
              own vocabulary; below the handover it all melts to texture. */}
          <img
            src={webMap}
            alt=""
            className="absolute inset-x-0 top-[34px] block h-[690px] w-full object-cover object-left-top opacity-80"
            style={{
              maskImage:
                'linear-gradient(to bottom, #000 0px, #000 114px, transparent 204px)',
              WebkitMaskImage:
                'linear-gradient(to bottom, #000 0px, #000 114px, transparent 204px)',
            }}
            loading="lazy"
          />
          <img
            src={webMap}
            alt=""
            className="absolute inset-x-0 top-[34px] block h-[690px] w-full object-cover object-left-top opacity-[0.42] blur-[3.5px]"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0px, transparent 114px, #000 204px)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0px, transparent 114px, #000 204px)',
            }}
            loading="lazy"
          />
        </div>

        {/* Whole, sharp, in front. Its bottom edge and the district row below
            the copy both land on y=798 so the two halves terminate together. */}
        {/* Centred on the browser's visible region rather than pinned to the
            nav's right margin — it read as hugging the edge out at 344. */}
        <div className="absolute left-[232px] top-[210px] w-[280px] rounded-[36px] bg-text-primary p-2.5 shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)]">
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
        <div className="flex flex-col items-start pt-10 md:pt-14 xl:w-[620px] xl:pt-[132px]">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-primary sm:text-xs xl:text-[12.5px] xl:tracking-[0.16em]">
            Cualquier distrito, cualquier propiedad
          </span>

          {/* 64px at lg, not 68: at 68 the first line came within 49px of the
              artwork, which on 96px outer margins reads as a collision. */}
          <h1 className="mt-4 font-serif text-[38px] font-normal leading-[1.05] tracking-[-0.02em] text-secondary sm:text-[40px] sm:leading-[1.06] xl:mt-6 xl:text-[64px] xl:leading-[1.02]">
            Anunciar en Piura
            <br />
            no cuesta nada.
          </h1>

          <p className="mt-4 max-w-[350px] font-sans text-[15.5px] leading-[1.5] text-text-secondary sm:max-w-[560px] sm:text-[17px] xl:mt-6 xl:text-[18.5px] xl:leading-[1.55]">
            Sin comisiones, sin tarifas, sin límite de avisos. Anuncias hoy y
            tu propiedad ya está en el mapa.
          </p>

          <Link
            to="/app/listings/new"
            onClick={stashPublishReturn}
            className="mt-7 flex h-14 w-full items-center justify-center rounded-xl bg-primary font-sans text-[15px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_2px_6px_rgba(244,120,67,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover sm:w-[320px] xl:w-[302px]"
          >
            Agrega tu propiedad
          </Link>

          <div className="mt-9 flex flex-col items-start gap-3 xl:mt-12">
            <span className="font-sans text-[13px] font-medium text-text-primary xl:text-sm">
              El mapa de Piura, en tu teléfono
            </span>
            {storeBadges}
          </div>

          {/* The desktop board carries this signal with the browser window, so
              it would be a duplicate there. */}
          <div className="mt-5 flex items-center gap-2 md:hidden">
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
          <div className="mt-8 xl:mt-14">{districtRow}</div>
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
        className="group mt-10 block md:hidden"
      >
        <div className="relative mx-auto overflow-hidden rounded-t-2xl shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)] md:hidden">
          <img
            src={appMap}
            alt="El mapa de Oqupa con precios reales de propiedades en Piura"
            className="block h-[348px] w-full object-cover object-[center_38%]"
            loading="eager"
          />
          {/* Deliberately quiet. On a 390x844 screen the thumb rests in the
              bottom third, which here is all map — a bright filled pill there
              was the easiest tap on the page, and the ad leads with "anunciar
              is free", not "go browsing". It still has to read as a control,
              so it keeps a solid ground and uppercase weight. */}
          <span className="absolute right-4 top-3 rounded-2xl border border-text-primary/10 bg-white/95 px-3.5 py-[7px] font-sans text-[11px] font-bold uppercase tracking-[0.9px] text-text-secondary shadow-[0_1px_4px_rgba(28,28,30,0.10)] transition-transform duration-200 group-hover:scale-[1.03]">
            Ver el mapa
          </span>
        </div>

      </Link>

      {/* ---------- Tablet diorama (md to xl) ------------------------------
          Earlier passes gave this range a lone cropped phone in a field of
          cream: it filled nothing and taught nothing, while desktop showed the
          website and the app in one image. Same diorama here, stacked under the
          copy, so all three widths make the same argument. The window bleeds off
          both sides and the bottom, so its only visible edge is the top one. */}
      <div className="relative mt-14 hidden h-[340px] overflow-hidden md:block xl:hidden">
        <div
          aria-hidden="true"
          className="absolute -left-10 -right-40 top-0 flex h-[420px] flex-col overflow-hidden rounded-t-xl border border-b-0 border-border bg-white shadow-[0_24px_48px_rgba(28,28,30,0.07)]"
        >
          {browserWindow(78, 158)}
        </div>
        {phoneFrame(
          'absolute right-16 top-[90px] w-[320px] rounded-[40px] bg-text-primary p-2.5 shadow-[0_2px_6px_rgba(28,28,30,0.14),0_24px_48px_rgba(28,28,30,0.10)]',
          'block h-[640px] w-full rounded-[31px] object-cover',
        )}
      </div>
    </section>
  )
}
