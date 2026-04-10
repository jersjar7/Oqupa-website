import { useEffect, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useWaitlistForm } from '@/hooks/useWaitlistForm'

interface WaitlistPopupProps {
  isReady: boolean
  isExpanded: boolean
  onCollapse: () => void
  onExpand: () => void
  onSuccess: () => void
}

export default function WaitlistPopup({ isReady, isExpanded, onCollapse, onExpand, onSuccess }: WaitlistPopupProps) {
  const { formData, errors, isSubmitting, isSuccess, handleChange, handleSubmit } =
    useWaitlistForm({ onSuccess })

  // Slide-in animation on first appearance
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (isReady) {
      // Small delay to trigger CSS transition after DOM mount
      const timer = setTimeout(() => setMounted(true), 50)
      return () => clearTimeout(timer)
    }
  }, [isReady])

  if (!isReady) return null

  return (
    <div
      className={`fixed z-50 bottom-0 left-0 right-0 md:bottom-4 md:left-auto md:right-4 md:w-[420px]
        transition-transform duration-500 ease-out
        ${mounted ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* Collapsed bar */}
      {!isExpanded && (
        <button
          onClick={onExpand}
          className="flex w-full items-center justify-between gap-3 bg-primary px-5 py-3.5 text-white shadow-large
            md:rounded-xl rounded-t-xl transition-colors duration-200 hover:bg-primary-hover cursor-pointer"
        >
          <span className="text-sm font-bold uppercase tracking-wider">
            Unirme a la Lista de Espera
          </span>
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      {/* Expanded form */}
      {isExpanded && (
        <div className="max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white shadow-large md:rounded-2xl animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 pt-5 pb-2 sm:px-6 sm:pt-6 rounded-t-2xl">
            <h3 className="font-serif font-medium text-lg text-secondary">
              Únete a la familia Oqupa
            </h3>
            <button
              onClick={onCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary"
              aria-label="Minimizar"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          <p className="font-sans font-normal px-5 pb-2 text-sm text-text-secondary sm:px-6">
            Sé uno de los primeros miembros de la familia Oqupa y publica tus propiedades gratis.
          </p>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6"
            noValidate
          >
            {isSuccess ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center animate-fade-in">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-white"
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
                <p className="font-bold text-text-primary">
                  ¡Registrado exitosamente!
                </p>
                <p className="text-sm text-text-secondary">
                  Te notificaremos cuando Oqupa esté disponible.
                </p>
              </div>
            ) : (
              <>
                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="popup-name"
                    className="font-sans font-medium uppercase text-xs text-secondary"
                  >
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="popup-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Tu nombre"
                    className={`rounded-xl border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.name ? 'border-error' : 'border-border'
                    }`}
                  />
                  {errors.name && (
                    <span className="text-xs text-error">{errors.name}</span>
                  )}
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="popup-phone"
                    className="font-sans font-medium uppercase text-xs text-secondary"
                  >
                    Teléfono (WhatsApp)
                  </label>
                  <div className={`flex items-center rounded-xl border transition-colors duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${
                    errors.phone ? 'border-error' : 'border-border'
                  }`}>
                    <span className="shrink-0 pl-3 text-sm text-text-tertiary select-none">+51</span>
                    <input
                      type="tel"
                      id="popup-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="999-999-999"
                      className="w-full bg-transparent px-2 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
                    />
                  </div>
                  {errors.phone && (
                    <span className="text-xs text-error">{errors.phone}</span>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="popup-email"
                    className="font-sans font-medium uppercase text-xs text-secondary"
                  >
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="popup-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tu@correo.com"
                    className={`rounded-xl border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.email ? 'border-error' : 'border-border'
                    }`}
                  />
                  {errors.email && (
                    <span className="text-xs text-error">{errors.email}</span>
                  )}
                </div>

                {/* City */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="popup-city"
                    className="font-sans font-medium uppercase text-xs text-secondary"
                  >
                    Ciudad de interés
                  </label>
                  <input
                    type="text"
                    id="popup-city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Ej: Sullana"
                    className={`rounded-xl border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.city ? 'border-error' : 'border-border'
                    }`}
                  />
                  {errors.city && (
                    <span className="text-xs text-error">{errors.city}</span>
                  )}
                </div>

                {/* Contact Consent */}
                <div className="flex flex-col gap-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="contactConsent"
                      checked={formData.contactConsent}
                      onChange={handleChange}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary accent-primary"
                    />
                    <span className="font-sans font-normal text-xs leading-relaxed text-text-secondary">
                      Acepto ser contactado por WhatsApp y correo electrónico
                    </span>
                  </label>
                  {errors.contactConsent && (
                    <span className="text-xs text-error">
                      {errors.contactConsent}
                    </span>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-medium transition-all duration-200 hover:bg-primary-hover hover:shadow-large disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin text-white"
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

                <p className="font-sans font-normal text-center text-[10px] leading-relaxed text-text-tertiary">
                  No compartiremos tu información con terceros. Solo te contactaremos
                  para informarte sobre el lanzamiento de Oqupa.
                </p>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
