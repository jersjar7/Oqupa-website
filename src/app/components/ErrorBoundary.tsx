import { Component, type ReactNode } from 'react'
import { AnalyticsLogger } from '@/lib/analytics'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    AnalyticsLogger.errorOccurred(error.message, 'ErrorBoundary')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
          <h2 className="font-serif text-xl font-normal text-text-primary">
            Algo salió mal
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Ocurrió un error inesperado.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false })
              window.location.reload()
            }}
            className="mt-4 min-h-11 rounded-full bg-primary px-6 font-sans text-sm font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-primary-hover"
          >
            Recargar
          </button>
          {/* A plain link: the crash may be outside the router. */}
          <a href="/reportar" className="mt-3 inline-flex min-h-11 items-center text-sm text-secondary underline-offset-2 hover:underline">
            Si sigue pasando, cuéntanos aquí
          </a>
        </div>
      )
    }

    return this.props.children
  }
}
