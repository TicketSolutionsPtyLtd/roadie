import { render, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { SpotIllustrationByName } from './illustrations'

// A chunk that fails to load, as after a deploy swaps its hash.
const load = vi.hoisted(() => vi.fn())
vi.mock('@oztix/roadie-illustrations/spot/load', () => ({
  isSpotIllustrationName: (name: unknown) => name === 'Ticket',
  loadedSpotIllustration: () => undefined,
  loadSpotIllustration: load
}))

it('keeps the block and its box when the illustration fails to load', async () => {
  load.mockRejectedValueOnce(new Error('Failed to fetch'))
  const { container } = render(
    <SpotIllustrationByName name='Ticket' className='size-16' />
  )
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
  await new Promise((settle) => setTimeout(settle, 0))
  expect(container.querySelector('svg.size-16')).not.toBeNull()
})
