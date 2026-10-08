import { execFileSync } from 'node:child_process'
import { statfsSync } from 'node:fs'
import { availableParallelism, loadavg } from 'node:os'
import { dirname, join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

export const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)

const GB = 1024 ** 3
const loadLimit =
  Number(process.env.ROADIE_LOAD_LIMIT) || availableParallelism()
const lowDiskGb = Number(process.env.ROADIE_LOW_DISK_GB) || 20
const loadPollMs = Number(process.env.ROADIE_LOAD_POLL_MS) || 15_000
const maxLoadWaitMs = 30 * 60 * 1000

export function freeDiskGb(path = repoRoot) {
  const { bavail, bsize } = statfsSync(path)
  return (bavail * bsize) / GB
}

export function warnIfLowDisk() {
  const free = freeDiskGb()
  if (free >= lowDiskGb) return false
  console.warn(
    `Low disk: ${free.toFixed(1)} GB free, under ${lowDiskGb} GB. Run \`pnpm cleanup\` to see what can go.`
  )
  return true
}

export async function waitForLoad() {
  const started = Date.now()
  for (;;) {
    const [load] = loadavg()
    if (load <= loadLimit) return
    if (Date.now() - started > maxLoadWaitMs) {
      throw new Error(
        `Load stayed above ${loadLimit} for 30 minutes. Giving up.`
      )
    }
    console.log(
      `Load ${load.toFixed(2)} is above ${loadLimit}. Waiting ${loadPollMs / 1000}s.`
    )
    await sleep(loadPollMs)
  }
}

export function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', ...options })?.trim()
}

export function killGroup(pid, signal) {
  try {
    process.kill(-pid, signal)
  } catch {
    // ESRCH: the group has already exited.
  }
}
