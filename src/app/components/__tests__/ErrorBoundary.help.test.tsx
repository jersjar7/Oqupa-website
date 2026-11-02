// @vitest-environment jsdom
// The crash screen gives a way to get help (audit 2026-11-02, F.6).
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: { errorOccurred: vi.fn() } }))
import ErrorBoundary from '../ErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('offers RECARGAR and a way to tell us', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /cuéntanos aquí/ }).getAttribute('href')).toBe('/reportar')
  })
})
