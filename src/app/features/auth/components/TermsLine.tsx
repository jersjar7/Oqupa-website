import { Link } from 'react-router-dom'

/** Under the buttons on both sign-up doors (ADR-046 #8). The app says the same. */
export default function TermsLine() {
  return (
    <p data-testid="terms-line" className="mt-6 text-center text-sm text-text-secondary">
      Al continuar aceptas los{' '}
      <Link to="/terms" className="underline hover:text-text-primary">
        Términos
      </Link>{' '}
      y la{' '}
      <Link to="/privacy" className="underline hover:text-text-primary">
        Política de Privacidad
      </Link>{' '}
      de Oqupa.
    </p>
  )
}
