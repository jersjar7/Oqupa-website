import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useMobileMenu } from '@/hooks/useMobileMenu'
import logo from '@/assets/images/Oqupa_FullLogo_multicolor.webp'

interface HeaderProps {
  variant?: 'full' | 'minimal'
  isScrolled?: boolean
  heroRef?: React.RefObject<HTMLElement | null>
}

interface NavLink {
  label: string
  href: string
  isRoute?: boolean
}

const NAV_LINKS: NavLink[] = [
  { label: 'Explorar', href: '/explorar', isRoute: true },
  { label: 'Lista de Espera', href: '#lista-espera' },
  { label: 'Publica Gratis', href: '#precios' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Header({
  variant = 'full',
  isScrolled = false,
}: HeaderProps) {
  const { isOpen, toggle, close, menuRef, toggleRef } = useMobileMenu()

  const handleSmoothScroll = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault()
      close()
      const id = href.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    },
    [close]
  )

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FFFAF5]/95 shadow-light backdrop-blur-xl py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          {variant === 'minimal' ? (
            <Link to="/" className="flex items-center">
              <img
                src={logo}
                alt="Oqupa"
                className={`transition-all duration-300 ${
                  isScrolled ? 'h-12' : 'h-[60px]'
                }`}
              />
            </Link>
          ) : (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="flex items-center"
            >
              <img
                src={logo}
                alt="Oqupa"
                className={`transition-all duration-300 ${
                  isScrolled ? 'h-12' : 'h-[60px]'
                }`}
              />
            </a>
          )}

          {/* Desktop Nav (full variant only) */}
          {variant === 'full' && (
            <nav className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map((link) =>
                link.isRoute ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`text-sm font-medium uppercase transition-colors duration-200 hover:text-primary ${
                      isScrolled ? 'text-text-primary' : 'text-text-primary'
                    }`}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className={`text-sm font-medium uppercase transition-colors duration-200 hover:text-primary ${
                      isScrolled ? 'text-text-primary' : 'text-text-primary'
                    }`}
                  >
                    {link.label}
                  </a>
                )
              )}
              <Link
                to="/app/login"
                className="inline-flex h-12 items-center rounded-full border-[1.5px] border-secondary px-6 text-base font-bold uppercase text-secondary transition-colors hover:border-secondary-hover hover:text-secondary-hover"
              >
                Ingresar
              </Link>
            </nav>
          )}

          {/* Mobile Hamburger (full variant only) */}
          {variant === 'full' && (
            <button
              ref={toggleRef}
              onClick={toggle}
              className="relative z-50 flex h-10 w-10 items-center justify-center md:hidden"
              aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isOpen}
            >
              <div className="flex w-6 flex-col gap-1.5">
                <span
                  className={`block h-0.5 w-full transition-all duration-300 ${
                    isOpen
                      ? 'translate-y-2 rotate-45 bg-text-primary'
                      : 'bg-text-primary'
                  }`}
                />
                <span
                  className={`block h-0.5 w-full transition-all duration-300 ${
                    isOpen
                      ? 'scale-x-0 opacity-0'
                      : 'bg-text-primary'
                  }`}
                />
                <span
                  className={`block h-0.5 w-full transition-all duration-300 ${
                    isOpen
                      ? '-translate-y-2 -rotate-45 bg-text-primary'
                      : 'bg-text-primary'
                  }`}
                />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu (full variant only) */}
      {variant === 'full' && (
        <>
          {/* Backdrop overlay */}
          <div
            className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
              isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={close}
            aria-hidden="true"
          />

          {/* Slide-down menu */}
          <div
            ref={menuRef}
            className={`fixed top-0 right-0 left-0 z-40 transform bg-[#FFFAF5] pt-20 shadow-medium transition-transform duration-300 ease-in-out md:hidden ${
              isOpen ? 'translate-y-0' : '-translate-y-full'
            }`}
          >
            <nav className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
              {NAV_LINKS.map((link) =>
                link.isRoute ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={close}
                    className="block border-b border-border py-4 text-base font-medium uppercase text-text-primary transition-colors duration-200 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className="block border-b border-border py-4 text-base font-medium uppercase text-text-primary transition-colors duration-200 hover:text-primary"
                  >
                    {link.label}
                  </a>
                )
              )}
              <Link
                to="/app/login"
                onClick={close}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-secondary text-base font-bold uppercase text-secondary transition-colors hover:border-secondary-hover hover:text-secondary-hover"
              >
                Ingresar
              </Link>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
