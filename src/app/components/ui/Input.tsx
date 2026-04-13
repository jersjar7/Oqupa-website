import { forwardRef, type InputHTMLAttributes } from 'react'
import InfoTip from './InfoTip'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

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
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            error
              ? 'border-error focus:border-error focus:ring-error/20'
              : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error" role="alert">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
