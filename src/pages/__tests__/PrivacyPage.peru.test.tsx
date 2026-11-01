// @vitest-environment jsdom
// The privacy page carries what Peru's data-protection reglamento
// (DS 016-2024-JUS) requires a privacy policy to say. Each test names the
// article it pins, so removing a section fails loudly instead of quietly
// dropping a legal requirement.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from '../PrivacyPage'

function sectionText(heading: RegExp): string {
  render(<MemoryRouter><PrivacyPage /></MemoryRouter>)
  const h2 = screen.getByRole('heading', { level: 2, name: heading })
  return h2.closest('section')!.textContent ?? ''
}

describe('PrivacyPage — Peru (Ley 29733, DS 016-2024-JUS)', () => {
  it('names the controller, Oqupa LLC in Utah (art. 6.1 item 1)', () => {
    const text = sectionText(/Quién es Responsable de tus Datos/)
    expect(text).toMatch(/Oqupa LLC/)
    expect(text).toMatch(/Utah, Estados Unidos/)
    expect(text).toMatch(/Decreto Supremo N° 016-2024-JUS/)
  })

  it('designates a representative for Peru, with an email (art. VII 7.1–7.2.1)', () => {
    const text = sectionText(/Quién es Responsable de tus Datos/)
    expect(text).toMatch(/Representante en el Perú/)
    expect(text).toMatch(/representante para el territorio peruano a Jerson Garcia/)
    expect(text).toMatch(/en nombre de Oqupa LLC/)
    expect(text).toMatch(/Autoridad Nacional de Protección de Datos Personales/)
    expect(text).toMatch(/derechos ARCO/)
    expect(text).toMatch(/admin@oqupa\.com/)
  })

  it('names the bases de datos (art. 6.1 item 4)', () => {
    const text = sectionText(/Quién es Responsable de tus Datos/)
    for (const base of ['Usuarios:', 'Asesores inmobiliarios:', 'Pagos:']) {
      expect(text).toContain(base)
    }
    expect(text).toMatch(/Registro Nacional de Protección de Datos Personales/)
  })

  it('says "base de datos", never "banco de datos" (Jerson, 2026-11-01)', () => {
    render(<MemoryRouter><PrivacyPage /></MemoryRouter>)
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/Bases de datos personales/)
    expect(text).not.toMatch(/bancos? de datos/i)
  })

  it('says which data is required and what happens without it (art. 6.1 items 5–6)', () => {
    const text = sectionText(/Información que Recopilamos/)
    expect(text).toMatch(/Qué datos son obligatorios/)
    expect(text).toMatch(/sin crear una cuenta/)
    expect(text).toMatch(/no podrás publicar ni contactar/)
  })

  it('lists every country data goes to and the safeguards (art. 6.1 item 7, arts. 18–20)', () => {
    const text = sectionText(/Transferencia Internacional \(Flujo Transfronterizo\)/)
    expect(text).toMatch(/Brasil \(São Paulo\)/)
    expect(text).toMatch(/southamerica-east1/)
    expect(text).toMatch(/us-central1/)
    expect(text).toMatch(/España/)
    for (const provider of ['Google', 'Cloudflare', 'Stripe', 'Meta y TikTok', 'Mapbox', 'Apple', 'Metricool']) {
      expect(text).toContain(provider)
    }
    expect(text).toMatch(/HTTPS\/TLS/)
    expect(text).toMatch(/No guardamos datos de tarjetas/)
  })

  it('states how long data is kept (art. 6.1 item 9)', () => {
    const text = sectionText(/Plazo de Conservación/)
    expect(text).toMatch(/30 días/)
    expect(text).toMatch(/45 días/)
    expect(text).toMatch(/365 días/)
    expect(text).toMatch(/90 días/)
    expect(text).toMatch(/puedes pedir su supresión/)
  })

  it('describes automated processing (art. 6.1 item 8, art. 87)', () => {
    const text = sectionText(/Decisiones Automatizadas/)
    expect(text).toMatch(/no toma decisiones automatizadas que produzcan efectos jurídicos/)
    expect(text).toMatch(/una persona lo revisará/)
  })

  it('explains how to exercise rights, the deadlines and the ANPD complaint (art. 6.1 item 10, arts. 69, 88)', () => {
    const text = sectionText(/Tus Derechos/)
    expect(text).toMatch(/Cómo ejercer tus derechos/)
    expect(text).toMatch(/Portabilidad/)
    expect(text).toMatch(/Revocar tu consentimiento/)
    expect(text).toMatch(/8 días para el derecho de información, 20 días para el derecho de acceso y 10 días/)
    expect(text).toMatch(/Yo cuido mis datos personales/)
  })

  it('the third-party list matches what the code uses: Mapbox and Metricool, no Google Maps basemap', () => {
    const text = sectionText(/Servicios de Terceros/)
    expect(text).toMatch(/Mapbox:/)
    expect(text).toMatch(/Metricool:/)
    expect(text).not.toMatch(/visualización y selección de ubicaciones/)
  })

  it('cross-references point at the right section numbers', () => {
    expect(sectionText(/Compartición de Datos/)).toMatch(/indicados en la sección 9/)
  })
})
