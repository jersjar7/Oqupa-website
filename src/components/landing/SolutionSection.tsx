import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import messyListings from '@/assets/images/messy-listings-collage.webp'
import cleanInterface from '@/assets/images/ubiqa-clean-interface.webp'

const BENEFITS = [
  'Evita avisos con informacion incompleta',
  'Accede a propiedades con datos verificados',
  'Disfruta de una busqueda clara y organizada',
] as const

export default function SolutionSection() {
  const { ref, isVisible } = useAnimateOnScroll()

  return (
    <section className="bg-[#FFFAF5] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Text Column */}
          <div className="flex flex-col gap-8">
            <h2 className="text-3xl font-medium leading-tight text-secondary sm:text-4xl">
              Encuentra tu propiedad ideal sin perder tiempo en avisos
              incompletos
            </h2>

            <ul className="flex flex-col gap-4">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mt-0.5 h-6 w-6 shrink-0 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-lg text-text-secondary">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Before / After Column */}
          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className="group relative overflow-hidden rounded-2xl shadow-medium">
              <img
                src={messyListings}
                alt="Avisos desordenados en metodos tradicionales"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
                <span className="rounded-lg bg-primary/90 px-3 py-1.5 text-xs font-semibold text-white">
                  Antes
                </span>
              </div>
            </div>

            {/* After */}
            <div className="group relative overflow-hidden rounded-2xl shadow-medium">
              <img
                src={cleanInterface}
                alt="Interfaz limpia y organizada de Oqupa"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
                <span className="rounded-lg bg-primary/90 px-3 py-1.5 text-xs font-semibold text-white">
                  Con Oqupa
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
