#!/usr/bin/env node
// Run straight after `pnpm build`: fails when a build wouldn't replay from the
// cache on an unchanged rerun. That happens when a build writes to its own
// inputs, and it makes every later run rebuild that package and everything
// that depends on it. A build that reads a file turbo doesn't hash still
// replays, so this can't catch that.
import { execSync } from 'node:child_process'

const dry = JSON.parse(
  execSync('pnpm exec turbo run build --filter="./packages/*" --dry=json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  })
)
const misses = dry.tasks.filter(
  (task) => task.command !== '<NONEXISTENT>' && task.cache.status !== 'HIT'
)

if (misses.length > 0) {
  console.error(
    `These builds would run again with nothing changed:\n${misses
      .map((task) => `  ${task.taskId} (${task.hash})`)
      .join('\n')}\nCompare \`pnpm turbo run build --dry=json\` before and ` +
      'after a build to find the input that moved.'
  )
  process.exit(1)
}
console.log(`All ${dry.tasks.length} package builds replay from the cache.`)
