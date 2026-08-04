// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import AccessListButton from '../AccessListButton'
import { PEOPLE, canAccess, peopleWith, type AccessArea } from '@/app/features/access/people'

/**
 * The button answers "who else can see this page?" on the three restricted
 * tabs. Its whole value is being TRUE — a list that quietly disagrees with the
 * guard is worse than no list, because it would be believed. So the assertions
 * below compare what it renders against `canAccess`, the check the guards and
 * the generated Firestore rules both come from, rather than against a
 * hard-coded roster that would need updating whenever someone joins.
 */
const AREAS: AccessArea[] = ['metrics', 'dev', 'marketing']

function openPanel(area: AccessArea) {
  render(<AccessListButton area={area} />)
  fireEvent.click(screen.getByRole('button'))
}

describe('the list shown is the list enforced', () => {
  it.each(AREAS)('%s shows exactly the people the guard admits', (area) => {
    openPanel(area)

    for (const person of PEOPLE) {
      const shown = screen.queryByText(person.email) !== null
      expect(shown).toBe(canAccess(person.email, area))
    }
  })

  it.each(AREAS)('%s shows a name alongside every email', (area) => {
    openPanel(area)
    for (const person of peopleWith(area)) {
      expect(screen.getByText(person.name)).toBeTruthy()
    }
  })

  it("does not leak one area's roster into another", () => {
    // Sarah is dev-only; she must not appear under Números.
    openPanel('metrics')
    expect(screen.queryByText('sarahwalkerdev@gmail.com')).toBeNull()
  })
})

describe('the count on the trigger', () => {
  it.each(AREAS)('%s matches how many people are listed', (area) => {
    render(<AccessListButton area={area} />)
    expect(screen.getByRole('button').textContent).toContain(String(peopleWith(area).length))
  })
})

describe('opening and closing', () => {
  it('shows nothing until pressed', () => {
    render(<AccessListButton area="metrics" />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('admin@oqupa.com')).toBeNull()
  })

  it('opens on click and closes on a second click', () => {
    openPanel('metrics')
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes on Escape', () => {
    openPanel('dev')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens with ArrowDown from the trigger', () => {
    render(<AccessListButton area="marketing" />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('reports its open state to assistive technology', () => {
    render(<AccessListButton area="metrics" />)
    const trigger = screen.getByRole('button')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
  })

  it('tells a screen reader what it opens and how many people are in it', () => {
    render(<AccessListButton area="metrics" />)
    const label = screen.getByRole('button').getAttribute('aria-label') ?? ''
    expect(label).toContain('Números')
    expect(label).toContain(String(peopleWith('metrics').length))
  })
})
