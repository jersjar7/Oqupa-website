// Phone browsers (Jerson, 2026-10-25): nothing pinned to the bottom of the
// screen may sit under the browser's bottom bar or the iPhone's home line.
// The page asks the phone for its safe area (viewport-fit=cover), and every
// bottom panel adds that space to its own bottom padding or position.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (p: string) => readFileSync(resolve(__dirname, '../../..', p), 'utf8')
const SAFE = 'env(safe-area-inset-bottom'

describe('phone safe area', () => {
  it('the page asks the phone for its safe area', () => {
    expect(read('index.html')).toMatch(/name="viewport"[^>]*viewport-fit=cover/)
  })
  it.each([
    'src/components/explore/MobileListingSheet.tsx',
    'src/pages/ExplorePage.tsx',
    'src/components/explore/list/MapListView.tsx',
    'src/app/features/listings/components/OfficialDistrictPicker.tsx',
    'src/app/components/shell/BottomTabs.tsx',
    'src/app/components/shell/DashboardShell.tsx',
    'src/app/features/leads/pages/LeadDetailPage.tsx',
  ])('%s keeps its bottom content above it', (file) => {
    expect(read(file)).toContain(SAFE)
  })
  it('the explore page lifts the listing card, the bar and the filters', () => {
    const page = read('src/pages/ExplorePage.tsx')
    expect(page.split(SAFE).length - 1).toBeGreaterThanOrEqual(2) // the bar + the filters drawer
    expect(read('src/components/explore/MobileListingSheet.tsx')).toContain(SAFE)
  })
})
