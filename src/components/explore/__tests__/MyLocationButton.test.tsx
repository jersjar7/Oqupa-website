// @vitest-environment jsdom
// ADR-046 #4: the website map gets My Location with the ADR-040 rule.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MyLocationButton from '../MyLocationButton'

describe('MyLocationButton', () => {
  it('goes to the person inside Piura', async () => {
    const onTarget = vi.fn()
    render(<MyLocationButton onTarget={onTarget} locate={async () => ({ lat: -5.19, lng: -80.63 })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mi ubicación' }))
    await waitFor(() => expect(onTarget).toHaveBeenCalledWith({ lat: -5.19, lng: -80.63, zoom: 15 }))
  })
  it('location off or refused → the default Piura view', async () => {
    const onTarget = vi.fn()
    render(<MyLocationButton onTarget={onTarget} locate={async () => null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mi ubicación' }))
    await waitFor(() => expect(onTarget).toHaveBeenCalledWith({ lat: -5.0492, lng: -80.659, zoom: 9 }))
  })
})
