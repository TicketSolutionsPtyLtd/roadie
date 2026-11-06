import { describe, expectTypeOf, it } from 'vitest'

import { catalogueSections } from '@oztix/roadie-blocks/catalogue/sections'
import type { EditorSection } from '@oztix/roadie-editor/extensions'

describe('catalogueSections', () => {
  // Neither package imports the other, so only a consumer can check the fit.
  it('makes sections the editor takes', () => {
    expectTypeOf(catalogueSections).returns.toExtend<readonly EditorSection[]>()
  })
})
