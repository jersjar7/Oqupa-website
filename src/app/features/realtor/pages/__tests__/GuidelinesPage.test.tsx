// @vitest-environment jsdom
// "Buenas prácticas", ported from the app's realtor_guidelines_page (ADR-046
// #20): agents and owners on the website never saw "Oqupa solo los pone en
// contacto" or "Firmen un acuerdo por escrito".
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GuidelinesPage from '../GuidelinesPage'

const meta = vi.hoisted(() => ({ last: null as unknown }))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: (m: unknown) => { meta.last = m } }))

describe('GuidelinesPage', () => {
  it('has the app title and every section and tip', () => {
    render(<GuidelinesPage />)
    expect(meta.last).toEqual({ title: 'Buenas prácticas' })
    for (const text of [
      'Oqupa conecta a dueños y agentes inmobiliarios. Estas son buenas prácticas para que tu experiencia sea segura y clara.',
      'Oqupa solo los pone en contacto',
      'Para agentes',
      'Firmen un acuerdo por escrito',
      'Sé profesional y claro',
      'Contacta a tiempo',
      'Para dueños',
      'Conversa antes de elegir',
      'Deja todo por escrito',
      'Tú tienes el control',
      'Tu seguridad primero',
    ]) {
      expect(screen.getByText(text)).toBeTruthy()
    }
    expect(screen.getByText(/Oqupa no es parte del acuerdo ni se hace responsable de él\./)).toBeTruthy()
  })
})
