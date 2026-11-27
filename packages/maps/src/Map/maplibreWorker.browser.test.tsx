import { expect, it } from 'vitest'

import { watchWorkers } from './workerTestUtils'

const { workers, mount } = watchWorkers()

it(
  'loads MapLibre’s worker with no setup, and hears back from it',
  { timeout: 10_000 },
  async () => {
    await mount()

    await expect
      .poll(() => workers.answered.length, { timeout: 8_000 })
      .toBeGreaterThan(0)
    expect(workers.failed).toEqual([])
  }
)
