// @vitest-environment jsdom
// An assigned agent cannot upload photos yet: getUploadUrl is owner-only
// (review 2026-11-02, decision). The page hides adding photos and says why;
// removing stays.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'agent-1' } }) }))
vi.mock('@/hooks/useListings', () => ({
  useListingDetails: () => ({
    isLoading: false,
    error: null,
    data: {
      listing: { id: 'L1', description: 'Casa', assignmentStatus: 'accepted', assignedRealtorId: 'agent-1' },
      property: { id: 'P1', media: { photoKeys: ['property-photos/P1/1-0.webp'], propertyPhotoUrls: [] } },
    },
  }),
}))
vi.mock('@/services/storageService', () => ({ storageService: {} }))
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(), httpsCallable: vi.fn() }))

import AgentEditListingPage from '../AgentEditListingPage'

describe('AgentEditListingPage photos', () => {
  it('no adding photos, with the reason; removing stays', () => {
    render(
      <MemoryRouter initialEntries={['/app/listings/L1/agent-edit']}>
        <Routes><Route path="/app/listings/:id/agent-edit" element={<AgentEditListingPage />} /></Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: 'Agregar foto' })).toBeNull()
    expect(screen.getByText('Por ahora solo el dueño puede agregar fotos nuevas.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Eliminar foto 1' })).toBeTruthy()
  })
})
