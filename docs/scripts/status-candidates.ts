// Prints the pages due a status review: `pnpm --filter docs exec tsx scripts/status-candidates.ts`.
import { getPageStatuses } from '../src/lib/page-manifest.ts'
import { getPageRelease, getReleaseHistory } from '../src/lib/releases.ts'
import { statusCandidates } from '../src/lib/status-candidates.ts'

const statuses = await getPageStatuses()
const pages = Object.entries(statuses).map(([route, status]) => ({
  route,
  status,
  release: getPageRelease(route)
}))
const candidates = statusCandidates(
  pages,
  getReleaseHistory(),
  new Date().toISOString().slice(0, 10)
)

if (candidates.length === 0) console.log('No status candidates.')
for (const { route, from, to, added, days } of candidates)
  console.log(
    `${route}: ${from} → ${to}? Added in ${added.label} ${added.version}, ${days} days ago.`
  )
