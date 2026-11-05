// Only the main checkout's copy of the old .husky/pre-push runs this, and app
// worktrees run that copy. Delete it once every checkout has scripts/pre-push.mjs.
import { waitForLoad } from './lib/machine.mjs'

try {
  await waitForLoad()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
