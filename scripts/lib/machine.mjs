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

export const isWindows = process.platform === 'win32'

const SAFE_FOR_CMD = /^[\w./:=@,+-]+$/

/**
 * How to start a package manager such as pnpm or npm. Windows reaches it
 * through a .cmd shim, which Node runs only in a shell, so it gets one command
 * line with each argument quoted for cmd.
 */
export function shimCommand(command, args, platform = process.platform) {
  if (platform !== 'win32') return { command, args, shell: false }
  const quoted = args.map((arg) =>
    SAFE_FOR_CMD.test(arg) ? arg : `"${arg.replaceAll('"', '\\"')}"`
  )
  return { command: [command, ...quoted].join(' '), args: [], shell: true }
}

// Windows has no process groups, so it kills the child's tree instead.
export function killGroup(pid, signal) {
  try {
    if (isWindows)
      execFileSync('taskkill', ['/pid', String(pid), '/t', '/f'], {
        stdio: 'ignore'
      })
    else process.kill(-pid, signal)
  } catch {
    // ESRCH: the group has already exited.
  }
}
