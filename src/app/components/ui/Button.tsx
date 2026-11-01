import { forwardRef, type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'text' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
}

const variantStyles: Record<ButtonVariant, { base: string; disabled: string }> = {
  primary: {
    base: 'h-12 rounded-full border-[1.5px] border-secondary px-6 text-base font-bold uppercase tracking-[1px] text-secondary hover:border-secondary-hover hover:text-secondary-hover focus-visible:ring-secondary',
    disabled: 'border-black/20 text-black/20',
  },
  text: {
    base: 'text-base font-normal normal-case text-secondary hover:text-secondary-hover focus-visible:ring-secondary',
    disabled: 'text-black/20',
  },
  danger: {
    base: 'h-12 rounded-full border-[1.5px] border-error px-6 text-base font-bold uppercase tracking-[1px] text-error hover:border-error-strong hover:text-error-strong focus-visible:ring-error',
    disabled: 'border-black/20 text-black/20',
  },
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      isLoading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading
    const styles = variantStyles[variant]

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none active:scale-[0.97] ${isDisabled ? styles.disabled : styles.base} ${className}`}
        {...props}
      >
        {isLoading && (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
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
            <span>CARGANDO...</span>
          </>
        )}
        {!isLoading && children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
