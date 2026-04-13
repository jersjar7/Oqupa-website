import { useCallback, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useScrollHeader } from '@/hooks/useScrollHeader'
import { useWaitlistPopup } from '@/hooks/useWaitlistPopup'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WaitlistPopup from '@/components/landing/WaitlistPopup'
import PageTransition from '@/app/components/ui/PageTransition'

export default function Layout() {
  const location = useLocation()
  const { isScrolled, heroRef } = useScrollHeader()
  const popup = useWaitlistPopup()

  const isLanding = location.pathname === '/'
  const isExplore = location.pathname === '/explorar'
  const headerVariant = isLanding ? 'full' : 'minimal'
  // Non-landing pages have no hero element, so force compact header
  const effectiveIsScrolled = isLanding ? isScrolled : true

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Listen for "expand-waitlist-popup" custom event from any page
  useEffect(() => {
    const handler = () => popup.expand()
    window.addEventListener('expand-waitlist-popup', handler)
    return () => window.removeEventListener('expand-waitlist-popup', handler)
  }, [popup.expand])

  const handleWaitlistSuccess = useCallback(() => {
    popup.markJoined()
  }, [popup.markJoined])

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        variant={headerVariant}
        isScrolled={effectiveIsScrolled}
      />

      <main className="flex-1">
        <PageTransition key={location.pathname}>
          <Outlet context={{ heroRef }} />
        </PageTransition>
      </main>

      <Footer />

      {/* Floating waitlist popup — hidden on explore page to avoid clutter */}
      {!isExplore && (
        <WaitlistPopup
          isReady={popup.isReady}
          isExpanded={popup.isExpanded}
          onCollapse={popup.collapse}
          onExpand={popup.expand}
          onSuccess={handleWaitlistSuccess}
        />
      )}
    </div>
  )
}
