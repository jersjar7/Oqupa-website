import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useScrollHeader } from '@/hooks/useScrollHeader'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function Layout() {
  const location = useLocation()
  const { isScrolled, heroRef } = useScrollHeader()

  const isLanding = location.pathname === '/'
  const headerVariant = isLanding ? 'full' : 'minimal'

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        variant={headerVariant}
        isScrolled={isScrolled}
      />

      <main className="flex-1">
        <Outlet context={{ heroRef }} />
      </main>

      <Footer />
    </div>
  )
}
