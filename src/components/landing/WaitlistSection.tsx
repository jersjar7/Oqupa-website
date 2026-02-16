import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'
import { useWaitlistForm } from '@/hooks/useWaitlistForm'

export default function WaitlistSection() {
  const { ref, isVisible } = useAnimateOnScroll()
  const { formData, errors, isSubmitting, isSuccess, handleChange, handleSubmit } =
    useWaitlistForm()

  return (
    <section
      id="lista-espera"
      className="bg-gradient-to-br from-secondary to-[#2E5544] py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`mx-auto max-w-2xl transition-all duration-700 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Heading */}
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
              Unete a la lista de espera
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/80">
              Se de los primeros en acceder a Oqupa cuando lancemos en Piura.
              Registrate y te avisaremos cuando estemos listos.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-10 flex flex-col gap-5 rounded-2xl bg-white p-8 shadow-large sm:p-10"
            noValidate
          >
            {isSuccess ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-primary">
                  Registrado exitosamente!
                </h3>
                <p className="text-text-secondary">
                  Te notificaremos cuando Oqupa este disponible en Piura.
                </p>
              </div>
            ) : (
              <>
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-text-primary"
                  >
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Tu nombre completo"
                    className={`rounded-xl border px-4 py-3 text-base text-text-primary outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.name ? 'border-error' : 'border-border'
                    }`}
                  />
                  {errors.name && (
                    <span className="text-sm text-error">{errors.name}</span>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-text-primary"
                  >
                    Correo electronico
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tu@correo.com"
                    className={`rounded-xl border px-4 py-3 text-base text-text-primary outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.email ? 'border-error' : 'border-border'
                    }`}
                  />
                  {errors.email && (
                    <span className="text-sm text-error">{errors.email}</span>
                  )}
                </div>

                {/* Intent */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="intent"
                    className="text-sm font-medium text-text-primary"
                  >
                    Que te interesa mas?
                  </label>
                  <select
                    id="intent"
                    name="intent"
                    value={formData.intent}
                    onChange={handleChange}
                    className={`rounded-xl border bg-white px-4 py-3 text-base text-text-primary outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.intent ? 'border-error' : 'border-border'
                    } ${!formData.intent ? 'text-text-tertiary' : ''}`}
                  >
                    <option value="" disabled>
                      Selecciona una opcion
                    </option>
                    <option value="buscar">Buscar propiedades</option>
                    <option value="publicar">Publicar propiedades</option>
                    <option value="ambos">Ambos</option>
                  </select>
                  {errors.intent && (
                    <span className="text-sm text-error">{errors.intent}</span>
                  )}
                </div>

                {/* Privacy Consent */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="privacyConsent"
                      checked={formData.privacyConsent}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary accent-primary"
                    />
                    <span className="text-sm leading-relaxed text-text-secondary">
                      Acepto la{' '}
                      <a
                        href="/#/privacy"
                        className="font-medium text-primary underline transition-colors duration-200 hover:text-primary-hover"
                      >
                        politica de privacidad
                      </a>{' '}
                      y el tratamiento de mis datos personales.
                    </span>
                  </label>
                  {errors.privacyConsent && (
                    <span className="text-sm text-error">
                      {errors.privacyConsent}
                    </span>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="h-5 w-5 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Registrando...
                    </>
                  ) : (
                    'Unirme a la Lista de Espera'
                  )}
                </button>
              </>
            )}
          </form>

          {/* Disclaimer */}
          <p className="mt-6 text-center text-xs leading-relaxed text-white/60">
            No compartiremos tu informacion con terceros. Solo te contactaremos
            para informarte sobre el lanzamiento de Oqupa.
          </p>
        </div>
      </div>
    </section>
  )
}
