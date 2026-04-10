import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import { Bell } from 'lucide-react'

export default function WaitlistSection() {
  const { ref, isVisible } = useAnimateOnScroll()

  const handleExpand = () => {
    window.dispatchEvent(new CustomEvent('expand-waitlist-popup'))
  }

  return (
    <section
      id="lista-espera"
      className="bg-[#FFFAF5] py-8 lg:py-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex justify-center">
            <Bell className="h-8 w-8 text-secondary" />
          </div>

          <h2 className="mt-6 font-serif text-2xl font-bold text-secondary md:text-[clamp(24px,2.5vw,36px)]">
            Únete a la Lista de Espera
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            Sé de los primeros en acceder a Oqupa cuando lancemos en Piura.
            Regístrate y te avisaremos cuando estemos listos.
          </p>

          <button
            onClick={handleExpand}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large cursor-pointer"
          >
            Registrarme
          </button>

          <p className="mt-6 text-xs leading-relaxed text-text-tertiary">
            No compartiremos tu información con terceros. Solo te contactaremos
            para informarte sobre el lanzamiento de Oqupa.
          </p>
        </div>
      </div>
    </section>
  )
}
