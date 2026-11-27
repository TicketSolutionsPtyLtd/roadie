import { setWorkerUrl } from 'maplibre-gl'
import { expect, it } from 'vitest'

import { watchWorkers } from './workerTestUtils'

const { workers, mount } = watchWorkers()

it(
  'keeps a worker URL the app set with MapLibre’s setWorkerUrl',
  { timeout: 10_000 },
  async () => {
    // A URL with no worker behind it, so only this URL being used can fail.
    const appUrl = new URL('/app-worker-here.mjs', location.href).href
    setWorkerUrl(appUrl)
    await mount().catch(() => {})

    await expect
      .poll(() => workers.failed, { timeout: 8_000 })
      .toContain(appUrl)
  }
)
