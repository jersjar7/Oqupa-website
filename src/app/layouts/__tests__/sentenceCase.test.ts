import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getNavGroups } from '../../components/shell/navItems'
import type { Capabilities } from '../../components/shell/capabilities'

// Menu and page labels are written in sentence case, like the app's menu
// (Mi perfil, Mis propiedades, Guardados, Historial de pagos). Only the first
// word is capitalised, plus names: Oqupa, the section names that are titles in
// their own right (Mi perfil, Mis propiedades, Asignadas…) and staff tool names.

const src = join(__dirname, '..', '..', '..')
const read = (p: string) => readFileSync(join(src, p), 'utf8')

// Words that may keep a capital after the first word.
const NAMES = new Set(['Oqupa', 'Ing.', 'Software', 'Admin', 'Agente', 'Asignadas', 'Mi', 'Mis'])

function isSentenceCase(label: string): boolean {
  const words = label.split(/\s+/).slice(1)
  return words.every((w) => !/^[¿¡(]?[A-ZÁÉÍÓÚÑ]/.test(w) || NAMES.has(w.replace(/^[¿¡(]/, '').replace(/\)$/, '')))
}

describe('sentence case on menu and page labels', () => {
  it('the dashboard navigation', () => {
    const all: Capabilities = { isAdmin: true, isRealtor: true, isMetricsViewer: true, isTeamMember: true, isMarketingMember: true }
    const labels = getNavGroups(all).flatMap((g) => g.items.map((i) => i.label))
    expect(labels.filter((l) => !isSentenceCase(l))).toEqual([])
    expect(labels).toContain('Mi registro')
  })

  it('the account menu in the header', () => {
    const labels = [...read('app/layouts/AppLayout.tsx').matchAll(/label: '([^']+)'/g)].map((m) => m[1] ?? '')
    expect(labels.length).toBeGreaterThan(5)
    expect(labels.filter((l) => !isSentenceCase(l))).toEqual([])
    expect(labels).toEqual(expect.arrayContaining(['Mis pagos', 'Cerrar sesión', 'Regístrate como agente', 'Solicitud en revisión']))
  })

  it('the "view as" menu', () => {
    const labels = [...read('app/components/shell/ViewAsMenu.tsx').matchAll(/label: '([^']+)'/g)].map((m) => m[1] ?? '')
    expect(labels).toEqual(expect.arrayContaining(['Como un agente', 'Como un dueño']))
  })

  it('page titles and buttons', () => {
    const cases: Array<[string, string]> = [
      ['app/features/listings/pages/CreateListingPage.tsx', 'Crear publicación'],
      ['app/features/listings/pages/EditListingPage.tsx', 'Editar publicación'],
      ['app/features/listings/pages/AgentEditListingPage.tsx', 'Guardar cambios'],
      ['app/features/profile/pages/ProfilePage.tsx', 'Guardar cambios'],
      ['app/features/profile/pages/ProfilePage.tsx', 'Eliminar cuenta'],
      ['app/features/profile/pages/ProfilePage.tsx', 'Regístrate como agente'],
      ['app/features/realtor/pages/RealtorRegistrationPage.tsx', 'Enviar solicitud'],
      ['app/features/realtor/pages/RealtorRegistrationPage.tsx', 'Ir a Mi perfil'],
      ['app/features/leads/pages/LeadsPage.tsx', 'Mis propiedades → Asignadas'],
      ['app/features/leads/components/RealtorClaimCard.tsx', 'Trabajar con este agente'],
      ['app/features/leads/components/RealtorClaimCard.tsx', 'Agente independiente'],
      ['app/features/admin/pages/AdminApplicationsPage.tsx', 'Aprobar solicitud'],
      ['app/features/admin/pages/AdminApplicationsPage.tsx', 'Rechazar solicitud'],
      ['app/features/admin/pages/AdminApplicationsPage.tsx', 'Información profesional'],
    ]
    const missing = cases.filter(([file, text]) => !read(file).includes(text))
    expect(missing).toEqual([])
  })
})
