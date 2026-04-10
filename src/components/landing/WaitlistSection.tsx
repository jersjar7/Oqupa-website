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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
              <Bell className="h-7 w-7 text-secondary" />
            </div>
          </div>

          <h2 className="mt-6 text-3xl font-medium text-secondary sm:text-4xl">
            Unete a la lista de espera
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            Se de los primeros en acceder a Oqupa cuando lancemos en Piura.
            Registrate y te avisaremos cuando estemos listos.
          </p>

          <button
            onClick={handleExpand}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large cursor-pointer"
          >
            Registrarme
          </button>

          <p className="mt-6 text-xs leading-relaxed text-text-tertiary">
            No compartiremos tu informacion con terceros. Solo te contactaremos
            para informarte sobre el lanzamiento de Oqupa.
          </p>
        </div>
      </div>
    </section>
  )
}
