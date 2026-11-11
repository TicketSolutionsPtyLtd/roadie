import { describe, expect, it } from 'vitest'

import { manifestComponent } from './manifest'

describe('manifestComponent', () => {
  it('takes SpotIllustration from the illustrations package, not the deprecated components subpath', () => {
    expect(manifestComponent('SpotIllustration')).toMatchObject({
      import: '@oztix/roadie-illustrations/spot',
      props: expect.arrayContaining([
        expect.objectContaining({ name: 'layers' })
      ])
    })
  })
})
