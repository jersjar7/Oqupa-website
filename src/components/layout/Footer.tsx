import { Link } from 'react-router-dom'
import logo from '@/assets/images/Oqupa_FullLogo_white.webp'

export default function Footer() {
  return (
    <footer id="contacto" className="bg-footer-bg text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Left: Logo */}
          <div className="flex flex-col items-start">
            <Link to="/">
              <img
                src={logo}
                alt="Oqupa"
                className="h-10"
              />
            </Link>
            <p className="mt-4 text-sm text-white/80">
              Tu próximo hogar ya está en el mapa.
            </p>
          </div>

          {/* Middle: Link sections */}
          <div className="grid grid-cols-2 gap-8">
            {/* Lanzamiento */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
                Lanzamiento
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#lista-espera"
                    className="text-sm text-white/80 transition-colors duration-200 hover:text-white"
                  >
                    Lista de Espera
                  </a>
                </li>
                <li>
                  <a
                    href="#precios"
                    className="text-sm text-white/80 transition-colors duration-200 hover:text-white"
                  >
                    Publica Gratis
                  </a>
                </li>
                <li>
                  <a
                    href="#caracteristicas"
                    className="text-sm text-white/80 transition-colors duration-200 hover:text-white"
                  >
                    Características
                  </a>
                </li>
              </ul>
            </div>

            {/* Informacion */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">
                Información
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:admin@oqupa.com"
                    className="text-sm text-white/80 transition-colors duration-200 hover:text-white"
                  >
                    Contacto
                  </a>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-sm text-white/80 transition-colors duration-200 hover:text-white"
                  >
                    Política de Privacidad
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-sm text-white/80 transition-colors duration-200 hover:text-white"
                  >
                    Términos de Servicio
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Trust badges + Social */}
          <div className="flex flex-col items-start md:items-end">
            {/* Trust badges */}
            <div className="mb-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/80">
                Hecho por piuranos.
              </span>
            </div>

            {/* Email contact */}
            <a
              href="mailto:admin@oqupa.com"
              className="flex items-center gap-2 text-sm text-white/80 transition-colors duration-200 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              admin@oqupa.com
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-center text-sm text-white/60">
            &copy; 2026 Oqupa LLC
          </p>
        </div>
      </div>
    </footer>
  )
}
