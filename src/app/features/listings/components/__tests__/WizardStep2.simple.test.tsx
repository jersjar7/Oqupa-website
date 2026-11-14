// @vitest-environment jsdom
// ADR-043 D4, D5, D12 — Detalles: − / + for dormitorios, baños and
// estacionamientos (0 dormitorios = "Monoambiente", Departamento only), a
// friendly description hint, "Medidas" and "¿Qué tiene?" with the app's list.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WizardStep2 from '../WizardStep2'
import { useListingFormStore } from '@/stores/listingFormStore'
import type { PropertyType } from '@/types/enums'

const DESCRIPTION = 'Casa amplia y luminosa cerca del parque central'

function prepare(propertyType: PropertyType, extra: Record<string, unknown> = {}) {
  useListingFormStore.getState().reset()
  useListingFormStore.getState().updateData({ propertyType, operationType: 'venta', role: 'owner', ...extra })
  useListingFormStore.getState().setStep(2)
}

const btn = (name: string | RegExp) => screen.getByRole('button', { name })
const value = (label: string) => screen.getByTestId(`stepper-${label}`).textContent
const describeIt = (text: string) => fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: text } })
const area = (v: string) =>
  fireEvent.change(screen.getByLabelText(/área total/i, { selector: 'input' }), { target: { value: v } })

describe('WizardStep2 — steppers (D4)', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('Casa: dormitorios and baños start at 1 and cannot go below 1; no number boxes', () => {
    prepare('casa')
    render(<WizardStep2 />)
    expect(value('Dormitorios')).toBe('1')
    expect(value('Baños')).toBe('1')
    expect(value('Estacionamientos')).toBe('0')
    expect((btn('Menos dormitorios') as HTMLButtonElement).disabled).toBe(true)
    expect((btn('Menos baños') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByLabelText(/dormitorios/i, { selector: 'input' })).toBeNull()
    expect(screen.queryByLabelText(/baños/i, { selector: 'input' })).toBeNull()
    expect(screen.queryByLabelText(/estacionamientos/i, { selector: 'input' })).toBeNull()
  })

  it('+ and − change the count; the buttons are at least 48 px', () => {
    prepare('casa')
    render(<WizardStep2 />)
    fireEvent.click(btn('Más dormitorios'))
    fireEvent.click(btn('Más dormitorios'))
    expect(value('Dormitorios')).toBe('3')
    fireEvent.click(btn('Menos dormitorios'))
    expect(value('Dormitorios')).toBe('2')
    expect(btn('Más dormitorios').className).toMatch(/\bh-12\b/)
    expect(btn('Más dormitorios').className).toMatch(/\bw-12\b/)
  })

  // Monoambiente is switched off until the app that reads 0 is on most phones
  // (hostile review 2026-11-02, HIGH): a Departamento keeps at least 1 for now.
  it('Departamento: at least 1 dormitorio while Monoambiente is off', async () => {
    prepare('departamento')
    render(<WizardStep2 />)
    expect(value('Dormitorios')).toBe('1')
    expect((btn('Menos dormitorios') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText('Monoambiente')).toBeNull()
    describeIt(DESCRIPTION)
    area('35')
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
    expect(useListingFormStore.getState().data.bedroomCount).toBe(1)
  })

  it('Alojamiento keeps at least 1 dormitorio', () => {
    prepare('hospedaje', { operationType: 'alquiler', rentalDurationType: 'shortTerm' })
    render(<WizardStep2 />)
    expect((btn('Menos dormitorios') as HTMLButtonElement).disabled).toBe(true)
  })

  it('Cuarto: no dormitorios stepper, only "Baño privado" Sí / No', () => {
    prepare('habitacion', { operationType: 'alquiler', rentalDurationType: 'longTerm' })
    render(<WizardStep2 />)
    expect(screen.queryByTestId('stepper-Dormitorios')).toBeNull()
    expect(screen.queryByTestId('stepper-Baños')).toBeNull()
    expect(btn('Sí')).toBeTruthy()
    expect(btn('No')).toBeTruthy()
  })

  // Same SÍ / NO pills as the app (ADR-043 D7, 2026-11-13).
  it('Cuarto: "Baño privado" Sí / No read like the app: upper case, bold, tracked pills', () => {
    prepare('habitacion', { operationType: 'alquiler', rentalDurationType: 'longTerm' })
    render(<WizardStep2 />)
    for (const name of ['Sí', 'No']) {
      const cls = btn(name).className.split(/\s+/)
      expect(cls).toEqual(expect.arrayContaining(['font-sans', 'font-bold', 'uppercase', 'tracking-[1px]', 'rounded-full']))
    }
  })

  it('Oficina: baños optional from 0 and kept when given (app parity)', async () => {
    prepare('oficina')
    render(<WizardStep2 />)
    expect(screen.queryByTestId('stepper-Dormitorios')).toBeNull()
    expect(value('Baños')).toBe('0')
    fireEvent.click(btn('Más baños'))
    describeIt('Oficina en el centro con buena luz natural')
    area('80')
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
    expect(useListingFormStore.getState().data.bathroomCount).toBe(1)
    expect(useListingFormStore.getState().data.bedroomCount).toBeNull()
  })

  it('Terreno: no room steppers, parking still there', () => {
    prepare('terreno')
    render(<WizardStep2 />)
    expect(screen.queryByTestId('stepper-Dormitorios')).toBeNull()
    expect(screen.queryByTestId('stepper-Baños')).toBeNull()
    expect(value('Estacionamientos')).toBe('0')
  })

  it('counts stop at 50 (the app\'s limit)', () => {
    prepare('casa', { bedroomCount: 50 })
    render(<WizardStep2 />)
    expect(value('Dormitorios')).toBe('50')
    expect((btn('Más dormitorios') as HTMLButtonElement).disabled).toBe(true)
  })

  it('ATRÁS keeps the counts', () => {
    prepare('casa')
    const { unmount } = render(<WizardStep2 />)
    fireEvent.click(btn('Más dormitorios'))
    fireEvent.click(btn('Más estacionamientos'))
    fireEvent.click(btn('Atrás'))
    expect(useListingFormStore.getState().step).toBe(1)
    unmount()
    useListingFormStore.getState().setStep(2)
    render(<WizardStep2 />)
    expect(value('Dormitorios')).toBe('2')
    expect(value('Estacionamientos')).toBe('1')
  })
})

describe('WizardStep2 — description hint (D5)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    prepare('casa')
  })

  it('says how many letters are missing, not a counter', () => {
    render(<WizardStep2 />)
    describeIt('Casa bonita') // 11 letters
    expect(screen.getByText('Escribe un poco más (faltan 9 letras)')).toBeTruthy()
    expect(screen.queryByText(/\/20/)).toBeNull()
    expect(screen.queryByText(/caracteres/)).toBeNull()
  })

  it('one letter missing is singular; at 20 the hint goes', () => {
    render(<WizardStep2 />)
    describeIt('Casa bonita en Piura') // 20
    expect(screen.queryByText(/Escribe un poco más/)).toBeNull()
    describeIt('Casa bonita en Piur') // 19
    expect(screen.getByText('Escribe un poco más (falta 1 letra)')).toBeTruthy()
  })

  it('SIGUIENTE with a short description says the same, in red, and stays', async () => {
    render(<WizardStep2 />)
    describeIt('Casa')
    area('120')
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(screen.getByText('Escribe un poco más (faltan 16 letras)').className).toMatch(/text-error/))
    expect(useListingFormStore.getState().step).toBe(2)
    // The first problem gets the focus (hostile review 2026-11-02).
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Descripción')))
  })
})

describe('WizardStep2 — Medidas and ¿Qué tiene? (D12)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('shows the headings "Medidas" and "¿Qué tiene?"', () => {
    prepare('casa')
    render(<WizardStep2 />)
    expect(screen.getByRole('heading', { name: 'Medidas' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '¿Qué tiene?' })).toBeTruthy()
    expect(screen.queryByText(/Especificaciones|Amenidades/)).toBeNull()
  })

  it('offers the app\'s list: 8 at first, "Más (11)" opens the rest', () => {
    prepare('casa')
    render(<WizardStep2 />)
    expect(btn('Piscina')).toBeTruthy()
    expect(btn('Semi Amoblado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ascensor' })).toBeNull()
    fireEvent.click(btn('Más (11)'))
    expect(btn('Ascensor')).toBeTruthy()
    expect(btn('Transporte Público')).toBeTruthy()
    expect(btn('Menos')).toBeTruthy()
  })

  it('Alquiler por noche gets the app\'s short-stay list', () => {
    prepare('departamento', { operationType: 'alquiler', rentalDurationType: 'shortTerm' })
    render(<WizardStep2 />)
    expect(btn('WiFi')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Piscina' })).toBeNull()
  })

  it('tapping a chip chooses it, tapping again unchooses it, and it is published', async () => {
    prepare('casa')
    render(<WizardStep2 />)
    fireEvent.click(btn('Piscina'))
    fireEvent.click(btn('Jardín'))
    fireEvent.click(btn('Jardín'))
    expect(btn('Piscina').getAttribute('aria-pressed')).toBe('true')
    expect(btn('Jardín').getAttribute('aria-pressed')).toBe('false')
    describeIt(DESCRIPTION)
    area('120')
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
    expect(useListingFormStore.getState().data.propertyAmenities).toEqual(['Piscina'])
  })

  it('another one can be added in up to 3 words, with the app\'s messages', () => {
    prepare('casa')
    render(<WizardStep2 />)
    const box = screen.getByPlaceholderText('Agregar otra (máx. 3 palabras)')
    fireEvent.change(box, { target: { value: 'Cochera para dos autos' } })
    fireEvent.click(btn('Agregar'))
    expect(screen.getByText('Máximo 3 palabras')).toBeTruthy()
    fireEvent.change(box, { target: { value: 'Huerto' } })
    fireEvent.click(btn('Agregar'))
    expect(btn('Huerto').getAttribute('aria-pressed')).toBe('true')
    fireEvent.change(box, { target: { value: 'huerto' } })
    fireEvent.click(btn('Agregar'))
    expect(screen.getByText('Ya existe')).toBeTruthy()
    fireEvent.change(box, { target: { value: '  ' } })
    fireEvent.click(btn('Agregar'))
    expect(screen.getByText('Ingresa una característica')).toBeTruthy()
    expect(useListingFormStore.getState().data.propertyAmenities).toEqual(['Huerto'])
  })

  it('an amenity a listing already has stays chosen when editing', () => {
    prepare('casa', { propertyAmenities: ['Piscina', 'Huerto'] })
    render(<WizardStep2 />)
    expect(btn('Piscina').getAttribute('aria-pressed')).toBe('true')
    expect(btn('Huerto').getAttribute('aria-pressed')).toBe('true')
  })
})

// Hostile review 2026-11-02 #6: an older listing with no dormitorios / baños
// recorded was saved as 1 / 1 by any edit. Missing stays missing unless the
// owner changes it.
describe('WizardStep2 — editing an older listing with missing counts (review #6)', () => {
  function openEdit() {
    localStorage.clear()
    const s = useListingFormStore.getState()
    s.startEdit('L1', 'P1')
    s.updateData({
      propertyType: 'casa', operationType: 'venta', role: 'owner',
      description: DESCRIPTION, totalAreaInSquareMeters: 120, bedroomCount: null, bathroomCount: null,
    })
    s.markEditBaseline()
    s.setStep(2)
  }

  it('shows them as not given and keeps them missing on SIGUIENTE', async () => {
    openEdit()
    render(<WizardStep2 />)
    expect(value('Dormitorios')).toBe('—')
    expect(value('Baños')).toBe('—')
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
    expect(useListingFormStore.getState().data.bedroomCount).toBeNull()
    expect(useListingFormStore.getState().data.bathroomCount).toBeNull()
  })

  it('+ gives the first real count', async () => {
    openEdit()
    render(<WizardStep2 />)
    fireEvent.click(btn('Más dormitorios'))
    expect(value('Dormitorios')).toBe('1')
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
    expect(useListingFormStore.getState().data.bedroomCount).toBe(1)
    expect(useListingFormStore.getState().data.bathroomCount).toBeNull()
  })
})

