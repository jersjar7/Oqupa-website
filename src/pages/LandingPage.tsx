import { useCallback, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import HeroSection from '@/components/landing/HeroSection'
import TrustStrip from '@/components/landing/TrustStrip'
import SolutionSection from '@/components/landing/SolutionSection'
import ShowcaseSection from '@/components/landing/ShowcaseSection'
import PricingSection from '@/components/landing/PricingSection'
import PiuraOnlyBanner from '@/components/landing/PiuraOnlyBanner'
import WaitlistSection from '@/components/landing/WaitlistSection'
import WaitlistPopup from '@/components/landing/WaitlistPopup'
import { useWaitlistPopup } from '@/hooks/useWaitlistPopup'

interface LayoutContext {
  heroRef: React.RefObject<HTMLElement | null>
}

export default function LandingPage() {
  const { heroRef } = useOutletContext<LayoutContext>()
  const waitlistSectionRef = useRef<HTMLDivElement>(null)
  const popup = useWaitlistPopup()

  // Auto-close popup when user scrolls to WaitlistSection
  useEffect(() => {
    const el = waitlistSectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry!.isIntersecting) {
          popup.hide()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [popup.hide])

  const handleWaitlistSuccess = useCallback(() => {
    popup.markJoined()
  }, [popup.markJoined])

  useEffect(() => {
    document.title = 'Oqupa - Todas las propiedades de Piura en un solo lugar'

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Oqupa',
      url: 'https://oqupa.com',
      logo: 'https://oqupa.com/favicon.png',
      description:
        'Oqupa centraliza los avisos inmobiliarios de Piura, elimina fraudes y conecta a usuarios con propietarios y agentes verificados.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Piura',
        addressCountry: 'PE',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'admin@oqupa.com',
        contactType: 'customer service',
      },
      sameAs: [],
    })

    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <>
      <HeroSection heroRef={heroRef} />
      <ShowcaseSection />
      <TrustStrip />
      <SolutionSection />
      <PricingSection />
      <PiuraOnlyBanner />
      <div ref={waitlistSectionRef}>
        <WaitlistSection onSuccess={handleWaitlistSuccess} />
      </div>

      <WaitlistPopup
        isReady={popup.isReady}
        isExpanded={popup.isExpanded}
        onCollapse={popup.collapse}
        onExpand={popup.expand}
        onSuccess={handleWaitlistSuccess}
      />
    </>
  )
}
