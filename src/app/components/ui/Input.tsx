import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import InfoTip from './InfoTip'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  /**
   * When true on a password input, renders an eye button on the right that
   * toggles visibility. Ignored for non-password inputs. Defaults to false
   * to avoid surprising existing password fields; opt in per field.
   */
  revealToggle?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', type, revealToggle, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const [revealed, setRevealed] = useState(false)

    const isPassword = type === 'password'
    const showToggle = revealToggle && isPassword
    const effectiveType = showToggle && revealed ? 'text' : type

    const inputEl = (
      <input
        ref={ref}
        id={inputId}
        type={effectiveType}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          showToggle ? 'pr-11' : ''
        } ${
          error
            ? 'border-error focus:border-error focus:ring-error/20'
            : 'border-border'
        } ${className}`}
        {...props}
      />
    )

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block font-sans font-medium uppercase text-xs text-secondary"
          >
            {label}
            {hint && <InfoTip text={hint} />}
          </label>
        )}
        {showToggle ? (
          <div className="relative">
            {inputEl}
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              aria-pressed={revealed}
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-background-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {revealed ? (
                // eye-off (currently visible → click to hide)
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.9 19.9 0 0 1 4.3-5.7"/>
                  <path d="M10.58 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a20.1 20.1 0 0 1-2.55 3.69"/>
                  <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                // eye (currently hidden → click to show)
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        ) : (
          inputEl
        )}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error" role="alert">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
