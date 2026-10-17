// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Toast } from '@oztix/roadie-components/toast'

import { BrandSwatches } from './BrandSwatches'

afterEach(cleanup)

describe('BrandSwatches', () => {
  it.each([
    ['blue', 'intent-brand-blue'],
    ['purple', 'intent-brand-purple'],
    ['orange', 'intent-brand-orange']
  ] as const)('offers the %s intent, %s, to copy', async (hue, intent) => {
    render(await BrandSwatches({ hue }), { wrapper: Toast.Provider })
    expect(screen.getByRole('button', { name: `Copy ${intent}` })).toBeTruthy()
  })

  it('offers no intent for a status hue', async () => {
    render(await BrandSwatches({ hue: 'green' }), {
      wrapper: Toast.Provider
    })
    expect(screen.queryByRole('button', { name: /Copy intent-/ })).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
  })
})
