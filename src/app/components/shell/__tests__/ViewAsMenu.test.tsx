// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * ViewAsMenu renders nothing for non-admins — but that check has to happen
 * AFTER every hook.
 *
 * It used to sit above a `useEffect`, so the hook count changed the moment
 * `caps.isAdmin` flipped: the first render (auth still loading, isAdmin false)
 * took the early return and ran five hooks; the render after auth resolved ran
 * six. React throws #310 on that and the error boundary takes the topbar — and
 * only for admins, which is why it survived normal use. Found by eslint's
 * react-hooks/rules-of-hooks on its first run, the day after the identical
 * mistake took down every property page.
 *
 * `rules-of-hooks` is the real guard now; these tests pin the BEHAVIOUR the
 * fix had to preserve — that non-admins still see nothing, and that an admin
 * whose status arrives late gets a working menu rather than a crash.
 */
const mockViewAs = { viewAs: 'self' as string, setViewAs: vi.fn() }
vi.mock('../viewAsContext', () => ({ useViewAs: () => mockViewAs }))

import ViewAsMenu from '../ViewAsMenu'
import type { Capabilities } from '../capabilities'

const caps = (isAdmin: boolean) =>
  ({ isAdmin, isRealtor: false }) as unknown as Capabilities

describe('who sees the menu', () => {
  it('renders nothing for a non-admin', () => {
    const { container } = render(<ViewAsMenu caps={caps(false)} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the trigger for an admin', () => {
    render(<ViewAsMenu caps={caps(true)} />)
    expect(screen.getByRole('button')).toBeTruthy()
  })
})

describe('when admin status arrives after the first render', () => {
  it('does not change its hook count', () => {
    // The exact sequence that used to throw: auth resolves, isAdmin flips
    // false -> true, and the component renders past the early return.
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a))

    const { rerender } = render(<ViewAsMenu caps={caps(false)} />)
    rerender(<ViewAsMenu caps={caps(true)} />)

    const hookErrors = errors
      .flat()
      .map(String)
      .filter((m) => /rendered more hooks|rendered fewer hooks|Rules of Hooks|error #3(00|01|10)/i.test(m))

    expect(hookErrors).toEqual([])
    expect(screen.getByRole('button')).toBeTruthy()
    spy.mockRestore()
  })

  it('survives losing admin status too', () => {
    const { rerender, container } = render(<ViewAsMenu caps={caps(true)} />)
    rerender(<ViewAsMenu caps={caps(false)} />)
    expect(container.firstChild).toBeNull()
  })
})
