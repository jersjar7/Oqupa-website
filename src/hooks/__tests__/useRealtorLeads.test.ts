// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ────────────────────────────────────────────────────────────────────

const firestoreServiceMock = {
  getAgentAssignedListingsWithProperties: vi.fn(),
  getAvailableLeads: vi.fn(),
  getClaimedLeadsWithDetails: vi.fn(),
  getClaimsForListing: vi.fn(),
  getClaimStatus: vi.fn(),
  createRealtorClaim: vi.fn(),
  assignRealtorToListing: vi.fn(),
  unassignRealtor: vi.fn(),
  acceptAssignment: vi.fn(),
  declineAssignment: vi.fn(),
}

vi.mock('@/services/firestoreService', () => ({
  firestoreService: firestoreServiceMock,
}))

const toastMock = { success: vi.fn(), error: vi.fn() }
vi.mock('sonner', () => ({ toast: toastMock }))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>()
  return { ...orig, useNavigate: () => navigateMock }
})

const refreshUserMock = vi.fn()
let mockUser: { id: string; claimsThisMonth: number } | null = {
  id: 'user-1',
  claimsThisMonth: 0,
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (s: unknown) => unknown) => {
    const state = { user: mockUser, refreshUser: refreshUserMock }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }))
vi.mock('firebase/firestore', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>()
  return { ...orig, doc: () => ({}), getFirestore: () => ({}) }
})

const {
  useAgentAssignments,
  useAvailableLeads,
  useClaimedLeads,
  useListingClaims,
  useClaimStatus,
  useClaimLead,
  useAssignRealtor,
  useUnassignRealtor,
  useAcceptAssignment,
  useDeclineAssignment,
} = await import('../useRealtorLeads')

// ── Wrapper ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return React.createElement(
    QueryClientProvider, { client: queryClient },
    React.createElement(MemoryRouter, null, children),
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAgentAssignments', () => {
  beforeEach(() => {
    firestoreServiceMock.getAgentAssignedListingsWithProperties.mockReset()
  })

  it('is disabled (does not call the service) when agentId is undefined', () => {
    renderHook(() => useAgentAssignments(undefined), { wrapper })
    expect(firestoreServiceMock.getAgentAssignedListingsWithProperties).not.toHaveBeenCalled()
  })

  it('is disabled when agentId is an empty string', () => {
    renderHook(() => useAgentAssignments(''), { wrapper })
    expect(firestoreServiceMock.getAgentAssignedListingsWithProperties).not.toHaveBeenCalled()
  })

  it('calls the service when agentId is provided', async () => {
    firestoreServiceMock.getAgentAssignedListingsWithProperties.mockResolvedValue([])
    const { result } = renderHook(() => useAgentAssignments('agent-1'), { wrapper })
    // Wait for query to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(firestoreServiceMock.getAgentAssignedListingsWithProperties).toHaveBeenCalledWith('agent-1')
    expect(result.current.isError).toBe(false)
  })

  it('returns the data from the service', async () => {
    const data = [{ id: 'listing-1' }]
    firestoreServiceMock.getAgentAssignedListingsWithProperties.mockResolvedValue(data)
    const { result } = renderHook(() => useAgentAssignments('agent-1'), { wrapper })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(result.current.data).toEqual(data)
  })
})

describe('useAvailableLeads', () => {
  beforeEach(() => {
    firestoreServiceMock.getAvailableLeads.mockReset()
    mockUser = { id: 'user-1', claimsThisMonth: 0 }
  })

  it('does not call the service when enabled=false', () => {
    renderHook(() => useAvailableLeads(false), { wrapper })
    expect(firestoreServiceMock.getAvailableLeads).not.toHaveBeenCalled()
  })

  it('calls the service with the current user id when enabled=true', async () => {
    firestoreServiceMock.getAvailableLeads.mockResolvedValue([])
    renderHook(() => useAvailableLeads(true), { wrapper })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(firestoreServiceMock.getAvailableLeads).toHaveBeenCalledWith('user-1')
  })

  it('passes undefined when user is null', async () => {
    mockUser = null
    firestoreServiceMock.getAvailableLeads.mockResolvedValue([])
    renderHook(() => useAvailableLeads(true), { wrapper })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(firestoreServiceMock.getAvailableLeads).toHaveBeenCalledWith(undefined)
  })
})

describe('useClaimedLeads', () => {
  beforeEach(() => {
    firestoreServiceMock.getClaimedLeadsWithDetails.mockReset()
  })

  it('is disabled when realtorId is undefined', () => {
    renderHook(() => useClaimedLeads(undefined), { wrapper })
    expect(firestoreServiceMock.getClaimedLeadsWithDetails).not.toHaveBeenCalled()
  })

  it('calls the service when realtorId is provided', async () => {
    firestoreServiceMock.getClaimedLeadsWithDetails.mockResolvedValue([])
    renderHook(() => useClaimedLeads('realtor-1'), { wrapper })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(firestoreServiceMock.getClaimedLeadsWithDetails).toHaveBeenCalledWith('realtor-1')
  })
})

describe('useListingClaims', () => {
  beforeEach(() => {
    firestoreServiceMock.getClaimsForListing.mockReset()
  })

  it('is disabled when both owner and listing id are missing', () => {
    renderHook(() => useListingClaims(undefined, undefined), { wrapper })
    expect(firestoreServiceMock.getClaimsForListing).not.toHaveBeenCalled()
  })

  it('is disabled when only one id is provided', () => {
    renderHook(() => useListingClaims('owner-1', undefined), { wrapper })
    expect(firestoreServiceMock.getClaimsForListing).not.toHaveBeenCalled()
  })

  it('calls the service when both ids are provided', async () => {
    firestoreServiceMock.getClaimsForListing.mockResolvedValue([])
    renderHook(() => useListingClaims('owner-1', 'listing-1'), { wrapper })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(firestoreServiceMock.getClaimsForListing).toHaveBeenCalledWith('owner-1', 'listing-1')
  })
})

describe('useClaimStatus', () => {
  beforeEach(() => {
    firestoreServiceMock.getClaimStatus.mockReset()
    mockUser = { id: 'user-1', claimsThisMonth: 0 }
  })

  it('returns canClaim=false, remaining=0, limit=5 when user is null', () => {
    mockUser = null
    const { result } = renderHook(() => useClaimStatus(), { wrapper })
    expect(result.current).toEqual({ canClaim: false, remaining: 0, limit: 5 })
    expect(firestoreServiceMock.getClaimStatus).not.toHaveBeenCalled()
  })

  it('calls firestoreService.getClaimStatus with the user when user is set', () => {
    firestoreServiceMock.getClaimStatus.mockReturnValue({ canClaim: true, remaining: 3, limit: 5 })
    const { result } = renderHook(() => useClaimStatus(), { wrapper })
    expect(firestoreServiceMock.getClaimStatus).toHaveBeenCalledWith(mockUser)
    expect(result.current).toEqual({ canClaim: true, remaining: 3, limit: 5 })
  })

  it('reflects service result for a user who has reached the limit', () => {
    firestoreServiceMock.getClaimStatus.mockReturnValue({ canClaim: false, remaining: 0, limit: 5 })
    const { result } = renderHook(() => useClaimStatus(), { wrapper })
    expect(result.current).toMatchObject({ canClaim: false, remaining: 0 })
  })
})

describe('useClaimLead', () => {
  beforeEach(() => {
    firestoreServiceMock.createRealtorClaim.mockReset()
    refreshUserMock.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    firestoreServiceMock.createRealtorClaim.mockResolvedValue(undefined)
    refreshUserMock.mockResolvedValue(undefined)
  })

  it('calls createRealtorClaim with the full claim payload on mutate', async () => {
    const { result } = renderHook(() => useClaimLead(), { wrapper })
    const payload = {
      listingId: 'listing-1',
      realtorId: 'realtor-1',
      listingOwnerId: 'owner-1',
      realtorName: 'Juan',
      realtorPhone: '+51 999 999 999',
      realtorBusinessName: 'Inmobiliaria Juan',
    }
    await act(async () => {
      await result.current.mutateAsync(payload)
    })
    expect(firestoreServiceMock.createRealtorClaim).toHaveBeenCalledWith(payload)
  })

  it('refreshes the user and shows success toast on success', async () => {
    const { result } = renderHook(() => useClaimLead(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        listingId: 'l-1', realtorId: 'r-1', listingOwnerId: 'o-1',
        realtorName: 'N', realtorPhone: 'P', realtorBusinessName: 'B',
      })
    })
    expect(refreshUserMock).toHaveBeenCalledOnce()
    expect(toastMock.success).toHaveBeenCalledWith('Propiedad reclamada exitosamente')
  })

  it('shows the service error message verbatim on failure', async () => {
    firestoreServiceMock.createRealtorClaim.mockRejectedValue(
      new Error('Ya reclamaste este lead este mes')
    )
    const { result } = renderHook(() => useClaimLead(), { wrapper })
    await act(async () => {
      try {
        await result.current.mutateAsync({
          listingId: 'l-1', realtorId: 'r-1', listingOwnerId: 'o-1',
          realtorName: 'N', realtorPhone: 'P', realtorBusinessName: 'B',
        })
      } catch {
        // mutation error propagated
      }
    })
    expect(toastMock.error).toHaveBeenCalledWith('Ya reclamaste este lead este mes')
  })

  it('shows fallback error message when error is not an Error instance', async () => {
    firestoreServiceMock.createRealtorClaim.mockRejectedValue('plain string error')
    const { result } = renderHook(() => useClaimLead(), { wrapper })
    await act(async () => {
      try {
        await result.current.mutateAsync({
          listingId: 'l-1', realtorId: 'r-1', listingOwnerId: 'o-1',
          realtorName: 'N', realtorPhone: 'P', realtorBusinessName: 'B',
        })
      } catch {
        // expected
      }
    })
    expect(toastMock.error).toHaveBeenCalledWith('Error al reclamar la propiedad')
  })
})

describe('useAssignRealtor', () => {
  beforeEach(() => {
    firestoreServiceMock.assignRealtorToListing.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    firestoreServiceMock.assignRealtorToListing.mockResolvedValue(undefined)
  })

  it('calls assignRealtorToListing with listingId, realtorId, and realtorPhone', async () => {
    const { result } = renderHook(() => useAssignRealtor(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ listingId: 'l-1', realtorId: 'r-1', realtorPhone: '+51 900' })
    })
    expect(firestoreServiceMock.assignRealtorToListing).toHaveBeenCalledWith('l-1', 'r-1', '+51 900')
  })

  it('shows success toast after successful assignment', async () => {
    const { result } = renderHook(() => useAssignRealtor(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ listingId: 'l-1', realtorId: 'r-1', realtorPhone: '+51 900' })
    })
    expect(toastMock.success).toHaveBeenCalledWith('Agente asignado exitosamente')
  })

  it('shows error toast when assignment fails', async () => {
    firestoreServiceMock.assignRealtorToListing.mockRejectedValue(new Error('denied'))
    const { result } = renderHook(() => useAssignRealtor(), { wrapper })
    await act(async () => {
      try {
        await result.current.mutateAsync({ listingId: 'l-1', realtorId: 'r-1', realtorPhone: '+51 900' })
      } catch {
        // expected
      }
    })
    expect(toastMock.error).toHaveBeenCalledWith('Error al asignar el agente')
  })
})

describe('useUnassignRealtor', () => {
  beforeEach(() => {
    firestoreServiceMock.unassignRealtor.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    firestoreServiceMock.unassignRealtor.mockResolvedValue(undefined)
  })

  it('calls unassignRealtor with the listingId', async () => {
    const { result } = renderHook(() => useUnassignRealtor(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('listing-1')
    })
    expect(firestoreServiceMock.unassignRealtor).toHaveBeenCalledWith('listing-1')
  })

  it('shows success toast after removal', async () => {
    const { result } = renderHook(() => useUnassignRealtor(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('listing-1')
    })
    expect(toastMock.success).toHaveBeenCalledWith('Agente removido')
  })

  it('shows error toast when unassignment fails', async () => {
    firestoreServiceMock.unassignRealtor.mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useUnassignRealtor(), { wrapper })
    await act(async () => {
      try {
        await result.current.mutateAsync('listing-1')
      } catch {
        // expected
      }
    })
    expect(toastMock.error).toHaveBeenCalledWith('Error al quitar el agente')
  })
})

describe('useDeclineAssignment', () => {
  beforeEach(() => {
    firestoreServiceMock.declineAssignment.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    firestoreServiceMock.declineAssignment.mockResolvedValue(undefined)
  })

  it('calls declineAssignment with listingId, currentDeclinedIds, and agentId', async () => {
    const { result } = renderHook(() => useDeclineAssignment(), { wrapper })
    const payload = { listingId: 'l-1', currentDeclinedIds: ['agent-x'], agentId: 'agent-y' }
    await act(async () => {
      await result.current.mutateAsync(payload)
    })
    expect(firestoreServiceMock.declineAssignment).toHaveBeenCalledWith('l-1', ['agent-x'], 'agent-y')
  })

  it('shows success toast after declining', async () => {
    const { result } = renderHook(() => useDeclineAssignment(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ listingId: 'l-1', currentDeclinedIds: [], agentId: 'agent-1' })
    })
    expect(toastMock.success).toHaveBeenCalledWith('Asignacion rechazada')
  })

  it('shows error toast when declining fails', async () => {
    firestoreServiceMock.declineAssignment.mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useDeclineAssignment(), { wrapper })
    await act(async () => {
      try {
        await result.current.mutateAsync({ listingId: 'l-1', currentDeclinedIds: [], agentId: 'agent-1' })
      } catch {
        // expected
      }
    })
    expect(toastMock.error).toHaveBeenCalledWith('Error al rechazar la asignacion')
  })
})

describe('useAcceptAssignment', () => {
  beforeEach(() => {
    firestoreServiceMock.acceptAssignment.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
    navigateMock.mockReset()
    firestoreServiceMock.acceptAssignment.mockResolvedValue(undefined)
  })

  it('calls acceptAssignment with the listingId', async () => {
    const { result } = renderHook(() => useAcceptAssignment(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('listing-1')
    })
    expect(firestoreServiceMock.acceptAssignment).toHaveBeenCalledWith('listing-1')
  })

  it('shows success toast after accepting', async () => {
    const { result } = renderHook(() => useAcceptAssignment(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('listing-1')
    })
    expect(toastMock.success).toHaveBeenCalledWith(
      '¡Invitación aceptada!',
      expect.objectContaining({ description: 'Ahora gestionas esta propiedad.' }),
    )
  })

  it('shows error toast when accepting fails (line 133)', async () => {
    firestoreServiceMock.acceptAssignment.mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useAcceptAssignment(), { wrapper })
    await act(async () => {
      try {
        await result.current.mutateAsync('listing-1')
      } catch {
        // expected
      }
    })
    expect(toastMock.error).toHaveBeenCalledWith('Error al aceptar la invitación')
  })
})
