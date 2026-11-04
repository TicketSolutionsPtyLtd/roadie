import { waitForLoad } from './lib/machine.mjs'

try {
  await waitForLoad()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
