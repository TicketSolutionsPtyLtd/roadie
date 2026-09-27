// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PropsList } from './PropsDefinitions'

describe('PropsList', () => {
  it('puts every term and definition inside a description list', () => {
    const { container } = render(
      <PropsList
        title='Chart'
        props={{
          label: {
            required: true,
            type: { name: 'string' },
            description: 'Fixed name for the card.'
          }
        }}
      />
    )
    const terms = container.querySelectorAll('dt, dd')
    expect(terms).toHaveLength(2)
    for (const term of terms) expect(term.closest('dl')).not.toBeNull()
  })
})
