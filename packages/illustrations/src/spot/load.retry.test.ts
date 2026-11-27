// @vitest-environment node
import { expect, it, vi } from 'vitest'

import { Ticket } from './illustrations/Ticket'
import { loadSpotIllustration } from './load'

const loadTicket = vi.hoisted(() => vi.fn())
vi.mock('./loaders', () => ({
  SPOT_ILLUSTRATION_LOADERS: { Ticket: loadTicket }
}))

it('loads again after a module fails to load', async () => {
  loadTicket.mockRejectedValueOnce(new Error('Failed to fetch'))
  await expect(loadSpotIllustration('Ticket')).rejects.toThrow()
  loadTicket.mockResolvedValueOnce({ Ticket })
  await expect(loadSpotIllustration('Ticket')).resolves.toBe(Ticket)
})
