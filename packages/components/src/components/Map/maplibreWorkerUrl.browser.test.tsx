import { expect, it } from 'vitest'

import { watchWorkers } from './workerTestUtils'

const { workers, mount } = watchWorkers()

it(
  'loads MapLibre’s worker from workerUrl when given one',
  { timeout: 10_000 },
  async () => {
    // A URL with no worker behind it, so only this URL being used can fail.
    const workerUrl = new URL('/no-worker-here.mjs', location.href).href
    await mount({ workerUrl }).catch(() => {})

    await expect
      .poll(() => workers.failed, { timeout: 8_000 })
      .toContain(workerUrl)
  }
)
