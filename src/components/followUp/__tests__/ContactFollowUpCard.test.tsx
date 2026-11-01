// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, type Mock } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'

// The A11b follow-up card on the website — the same card as the app's
// contact_follow_up_sheet.dart: the same words, the same answers sent, the
// contacted listing shown above the question. Draft copy (Jerson's spec,
// 2026-10-31), identical on both platforms.

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))
vi.mock('sonner', () => ({ toast: (...a: unknown[]) => toastMock(...a) }))

import ContactFollowUpCard from '../ContactFollowUpCard'
import type { FollowUpSession } from '@/lib/contactFollowUpCoordinator'
import type { DueFollowUpCard, FollowUpAnswer, FollowUpCardName } from '@/services/contactFollowUpService'
import { thumbnail } from '@/lib/imageUrl'

beforeAll(() => {
  // jsdom has no <dialog>.showModal / close.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
})

const base: DueFollowUpCard = {
  card: 'wrote',
  listingId: 'L1',
  propertyType: 'casa',
  operationType: 'alquiler',
  district: 'Castilla',
  priceAmount: 1700,
  priceCurrency: 'PEN',
  photoKey: 'property-photos/p1/1-0.webp',
  rentalDurationType: 'longTerm',
  contactRole: 'owner',
}

let answers: [FollowUpCardName, FollowUpAnswer][]
let steps: FollowUpCardName[]
let done: Mock<() => void>

const session: FollowUpSession = {
  answer: async (card, answer) => { answers.push([card, answer]) },
  stepShown: (card) => { steps.push(card) },
}

function show(over: Partial<DueFollowUpCard> = {}) {
  return render(<ContactFollowUpCard card={{ ...base, ...over }} session={session} onDone={done} />)
}

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

beforeEach(async () => {
  // Let the last test's unmounted card report its close before resetting.
  await new Promise((r) => setTimeout(r, 0))
  answers = []
  steps = []
  done = vi.fn<() => void>()
  toastMock.mockReset()
})

describe('"wrote" — ¿Pudiste contactar al dueño?', () => {
  it('asks about the owner, with SÍ and TODAVÍA NO', () => {
    show()
    expect(screen.getByText('¿Pudiste contactar al dueño?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'SÍ' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'TODAVÍA NO' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'YA NO ME INTERESA' })).toBeNull()
  })

  it('says "agente" when the number reached the listing\'s agent', () => {
    show({ contactRole: 'agent' })
    expect(screen.getByText('¿Pudiste contactar al agente?')).toBeTruthy()
  })

  it('SÍ sends yes, closes and thanks them', () => {
    show()
    click('SÍ')
    expect(answers).toEqual([['wrote', 'yes']])
    expect(toastMock).toHaveBeenCalledWith('¡Gracias!', expect.objectContaining({ duration: 2000 }))
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('TODAVÍA NO sends not_yet', () => {
    show()
    click('TODAVÍA NO')
    expect(answers).toEqual([['wrote', 'not_yet']])
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('the (x) is dismissed — no thanks', () => {
    show()
    click('Cerrar')
    expect(answers).toEqual([['wrote', 'dismissed']])
    expect(toastMock).not.toHaveBeenCalled()
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('Escape is dismissed too', () => {
    const { container } = show()
    const dialog = container.ownerDocument.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(answers).toEqual([['wrote', 'dismissed']])
  })

  it('an answer is sent once, however many taps', () => {
    show()
    const yes = screen.getByRole('button', { name: 'SÍ' })
    fireEvent.click(yes)
    fireEvent.click(yes)
    expect(answers).toEqual([['wrote', 'yes']])
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('going away without answering counts as closing it', async () => {
    const { unmount } = show()
    unmount()
    await new Promise((r) => setTimeout(r, 0))
    expect(answers).toEqual([['wrote', 'dismissed']])
  })

  it("React's StrictMode rehearsal is not taken for going away", async () => {
    render(
      <StrictMode>
        <ContactFollowUpCard card={base} session={session} onDone={done} />
      </StrictMode>,
    )
    await new Promise((r) => setTimeout(r, 0))
    expect(answers).toEqual([])
    click('SÍ')
    await new Promise((r) => setTimeout(r, 0))
    expect(answers).toEqual([['wrote', 'yes']])
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('"reply" — ¿El dueño te respondió?', () => {
  it('has SÍ, TODAVÍA NO and YA NO ME INTERESA', () => {
    show({ card: 'reply' })
    expect(screen.getByText('¿El dueño te respondió?')).toBeTruthy()
    for (const name of ['SÍ', 'TODAVÍA NO', 'YA NO ME INTERESA']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('agent wording', () => {
    show({ card: 'reply', contactRole: 'agent' })
    expect(screen.getByText('¿El agente te respondió?')).toBeTruthy()
  })

  it.each([
    ['SÍ', 'yes'],
    ['TODAVÍA NO', 'not_yet'],
  ] as const)('%s sends %s', (label, answer) => {
    show({ card: 'reply' })
    click(label)
    expect(answers).toEqual([['reply', answer]])
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('YA NO ME INTERESA sends not_interested and asks ¿Por qué?', () => {
    show({ card: 'reply' })
    click('YA NO ME INTERESA')
    expect(answers).toEqual([['reply', 'not_interested']])
    expect(steps).toEqual(['reason'])
    expect(done).not.toHaveBeenCalled()
    expect(screen.getByText('¿Por qué?')).toBeTruthy()
    for (const name of ['ENCONTRÉ OTRA', 'EL PRECIO', 'NO ME CONVENCIÓ', 'OTRO', 'Omitir']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('the (x) on ¿El dueño te respondió? is dismissed', () => {
    show({ card: 'reply' })
    click('Cerrar')
    expect(answers).toEqual([['reply', 'dismissed']])
  })
})

describe('"reason" — ¿Por qué?', () => {
  function toReason() {
    show({ card: 'reply' })
    click('YA NO ME INTERESA')
    answers = []
  }

  it.each([
    ['ENCONTRÉ OTRA', 'found_other'],
    ['EL PRECIO', 'price'],
    ['NO ME CONVENCIÓ', 'not_convinced'],
    ['OTRO', 'other'],
    ['Omitir', 'skipped'],
  ] as const)('%s sends %s and thanks them', (label, answer) => {
    toReason()
    click(label)
    expect(answers).toEqual([['reason', answer]])
    expect(toastMock).toHaveBeenCalledWith('¡Gracias!', expect.anything())
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('closing on ¿Por qué? is skipped, not dismissed', () => {
    toReason()
    click('Cerrar')
    expect(answers).toEqual([['reason', 'skipped']])
  })
})

describe('the contacted listing', () => {
  it('"Tipo · Distrito" and a monthly rent', () => {
    show()
    expect(screen.getByText('Casa · Castilla')).toBeTruthy()
    expect(screen.getByText('S/. 1,700/mes')).toBeTruthy()
  })

  it('a nightly rent reads /noche; a rent with no period reads /mes', () => {
    const { unmount } = show({ rentalDurationType: 'shortTerm' })
    expect(screen.getByText('S/. 1,700/noche')).toBeTruthy()
    unmount()
    show({ rentalDurationType: null })
    expect(screen.getByText('S/. 1,700/mes')).toBeTruthy()
  })

  it('a sale has no period', () => {
    show({ operationType: 'venta', priceAmount: 250000, priceCurrency: 'USD', rentalDurationType: null })
    expect(screen.getByText('US$ 250,000')).toBeTruthy()
  })

  it('no price, no price line; no type, only the district', () => {
    show({ priceAmount: null, priceCurrency: null, propertyType: null })
    expect(screen.getByText('Castilla')).toBeTruthy()
    expect(screen.queryByText(/S\/\./)).toBeNull()
  })

  it('shows the listing\'s photo through the image helper', () => {
    const { baseElement } = show()
    const img = baseElement.querySelector('img')!
    expect(img.getAttribute('src')).toBe(thumbnail('property-photos/p1/1-0.webp'))
  })

  it('no photo: a placeholder, no broken image', () => {
    const { baseElement } = show({ photoKey: null })
    expect(baseElement.querySelector('img')).toBeNull()
    expect(screen.getByTestId('follow-up-photo-placeholder')).toBeTruthy()
  })

  it('opens the listing in a new tab, leaving the question waiting', () => {
    show()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/property/L1')
    expect(link.getAttribute('target')).toBe('_blank')
    fireEvent.click(link)
    expect(answers).toEqual([])
    expect(done).not.toHaveBeenCalled()
  })
})

describe('brand', () => {
  it('a cream card marked as the follow-up card', () => {
    const { container } = show()
    const dialog = container.ownerDocument.querySelector('dialog')!
    expect(dialog.hasAttribute('data-follow-up-card')).toBe(true)
    expect(dialog.querySelector('.bg-cream')).toBeTruthy()
  })

  it('the question is Roboto Serif Regular, never bold', () => {
    show()
    const q = screen.getByText('¿Pudiste contactar al dueño?')
    expect(q.className).toMatch(/\bfont-serif\b/)
    expect(q.className).toMatch(/\bfont-normal\b/)
    expect(q.className).not.toMatch(/font-(bold|semibold|medium)/)
  })

  it('buttons are Gotham Bold, uppercase, tracked 1 px, in green', () => {
    show({ card: 'reply' })
    const yes = screen.getByRole('button', { name: 'SÍ' })
    expect(yes.className).toMatch(/\bbg-secondary\b/)
    expect(yes.className).toMatch(/\btext-white\b/)
    for (const name of ['SÍ', 'TODAVÍA NO', 'YA NO ME INTERESA']) {
      const b = screen.getByRole('button', { name })
      expect(b.className).toMatch(/\bfont-sans\b/)
      expect(b.className).toMatch(/\bfont-bold\b/)
      expect(b.className).toMatch(/\buppercase\b/)
      expect(b.className).toMatch(/tracking-\[1px\]/)
    }
    const notYet = screen.getByRole('button', { name: 'TODAVÍA NO' })
    expect(notYet.className).toMatch(/\btext-secondary\b/)
    expect(notYet.className).toMatch(/\bborder-secondary\b/)
  })

  it('no stock Tailwind colours, no hex, nothing orange', () => {
    const { container } = show({ card: 'reply' })
    const html = container.ownerDocument.querySelector('dialog')!.outerHTML
    expect(html).not.toMatch(/(?<![\w-])(?:bg|text|border)-(?:gray|red|green|amber|blue|slate|zinc|neutral|orange)-\d/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
    expect(html).not.toMatch(/(?<![\w-])(?:bg|text|border)-primary\b/)
  })

  it('the listing is a white card on the cream', () => {
    show()
    const link = screen.getByRole('link')
    expect(link.className).toMatch(/\bbg-white\b/)
    expect(within(link).getByText('Casa · Castilla').className).toMatch(/\bfont-medium\b/)
  })
})
