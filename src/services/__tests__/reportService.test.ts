// "Reportar anuncio" on the website (ADR-046 #5): the app's six reasons, and
// the exact document the rules accept (firestore.rules /reports).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { addDocMock, collectionMock, authState } = vi.hoisted(() => ({
  addDocMock: vi.fn().mockResolvedValue({ id: 'r1' }),
  collectionMock: vi.fn((..._a: unknown[]) => ({ __col: 'reports' })),
  authState: { currentUser: null as null | { uid: string } },
}))

vi.mock('firebase/firestore', () => ({
  addDoc: (...a: unknown[]) => addDocMock(...a),
  collection: (...a: unknown[]) => collectionMock(...a),
  serverTimestamp: () => ({ _server: true }),
}))
vi.mock('@/lib/firebase', () => ({ db: {}, auth: authState }))

import { reportService, REPORT_REASONS } from '../reportService'

describe('reportService', () => {
  beforeEach(() => {
    addDocMock.mockClear()
    authState.currentUser = null
  })

  it('offers the app six reasons, in order', () => {
    expect(REPORT_REASONS).toEqual([
      'Información incorrecta',
      'Fotos inapropiadas',
      'Spam o publicidad',
      'Propiedad no existe',
      'Precio engañoso',
      'Otro',
    ])
  })

  it('a guest report has a null reporter', async () => {
    await reportService.reportListing({ listingId: 'L1', ownerUserId: 'O1', reason: 'Spam o publicidad' })
    expect(collectionMock).toHaveBeenCalledWith(expect.anything(), 'reports')
    expect(addDocMock).toHaveBeenCalledWith(expect.anything(), {
      listingId: 'L1',
      ownerUserId: 'O1',
      reporterId: null,
      reason: 'Spam o publicidad',
      createdAt: { _server: true },
    })
  })

  it('a signed-in report stamps the reporter uid', async () => {
    authState.currentUser = { uid: 'U9' }
    await reportService.reportListing({ listingId: 'L1', ownerUserId: 'O1', reason: 'Otro' })
    expect(addDocMock.mock.calls[0]![1]).toMatchObject({ reporterId: 'U9' })
  })
})
