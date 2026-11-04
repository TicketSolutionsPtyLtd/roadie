import { describe, expect, it } from 'vitest'

import { exampleAt } from './example-code'

describe('exampleAt', () => {
  it('reads the docs page and example id from an example address', () => {
    expect(exampleAt('/examples/components/number-field/default/')).toEqual({
      page: 'components/number-field',
      id: 'default'
    })
  })

  it('names nothing outside an example address', () => {
    expect(exampleAt('/examples/shell/')).toBeUndefined()
    expect(exampleAt('/components/badge/')).toBeUndefined()
  })
})
