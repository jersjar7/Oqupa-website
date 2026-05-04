import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import HeroSection from '@/components/landing/HeroSection'
import TrustStrip from '@/components/landing/TrustStrip'
import SolutionSection from '@/components/landing/SolutionSection'
import ShowcaseSection from '@/components/landing/ShowcaseSection'
import PricingSection from '@/components/landing/PricingSection'
import PiuraOnlyBanner from '@/components/landing/PiuraOnlyBanner'
import ExpansionSection from '@/components/landing/ExpansionSection'

interface LayoutContext {
  heroRef: React.RefObject<HTMLElement | null>
}

export default function LandingPage() {
  const { heroRef } = useOutletContext<LayoutContext>()

  useDocumentMeta({
    title: 'Oqupa - Tu proximo hogar ya esta en el mapa',
    description:
      'Oqupa centraliza los avisos inmobiliarios de Piura, elimina fraudes y conecta a usuarios con propietarios y agentes verificados.',
    url: 'https://oqupa.com',
  })

  // Structured data (JSON-LD)
  useEffect(() => {
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
      <ExpansionSection />
    </>
  )
}
