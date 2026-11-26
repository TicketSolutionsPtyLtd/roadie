import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import components from '@oztix/roadie-components/roadie.manifest.json' with { type: 'json' }
import editor from '@oztix/roadie-editor/roadie.manifest.json' with { type: 'json' }

// Each needs a function or a client hook's instance as a required prop, which
// a Server Component can't pass.
const CLIENT_ONLY: Record<string, string> = {
  Records: 'takes `records`, the instance useRecords returns',
  Sortable: 'takes `onReorder`, a function'
}

const canary = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('the RSC canary', () => {
  it('renders every compound from its subpath', () => {
    const compounds = [components, editor].flatMap((manifest) =>
      manifest.components.filter(
        (component) =>
          'parts' in component && (component.parts?.length ?? 0) > 0
      )
    )
    const missing = compounds
      .filter((compound) => !(compound.name in CLIENT_ONLY))
      .filter((compound) => !canary.includes(`from '${compound.import}'`))
      .map((compound) => compound.import)

    expect(compounds.length).toBeGreaterThan(40)
    expect(missing).toEqual([])
  })

  it('lists only compounds that exist as client-only', () => {
    const names = components.components.map((component) => component.name)
    expect(
      Object.keys(CLIENT_ONLY).filter((name) => !names.includes(name))
    ).toEqual([])
  })
})
