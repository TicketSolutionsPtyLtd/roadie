import { spawn } from 'node:child_process'
import { join } from 'node:path'

import { isWindows, killGroup, repoRoot, shimCommand } from './machine.mjs'

function runCommand([command, ...args], { cwd, env, deadline, onChild }) {
  const resolved =
    command === 'node'
      ? { command: process.execPath, args, shell: false }
      : shimCommand(command, args)
  return new Promise((resolvePromise) => {
    const child = spawn(resolved.command, resolved.args, {
      cwd: join(repoRoot, cwd ?? ''),
      env,
      shell: resolved.shell,
      // Detached on Windows means a new console window, not a process group.
      detached: !isWindows,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    onChild(child)
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    let timedOut = false
    const timer =
      deadline === null
        ? null
        : setTimeout(
            () => {
              timedOut = true
              killGroup(child.pid, 'SIGTERM')
              setTimeout(() => killGroup(child.pid, 'SIGKILL'), 5_000).unref()
            },
            Math.max(0, deadline - Date.now())
          )
    child.on('error', (error) => {
      onChild(null)
      clearTimeout(timer)
      resolvePromise({ code: 1, output: error.message, timedOut: false })
    })
    child.on('close', (code) => {
      onChild(null)
      clearTimeout(timer)
      resolvePromise({ code, output, timedOut })
    })
  })
}

/** `onChild` sees each running child, so the hook can pass a signal on to its group. */
export async function runStep(
  step,
  { env = process.env, onChild = () => {} } = {}
) {
  const deadline =
    step.budgetS === null ? null : Date.now() + step.budgetS * 1000
  for (const command of step.commands) {
    const result = await runCommand(command, {
      cwd: step.cwd,
      env: { ...env, ...step.env },
      deadline,
      onChild
    })
    if (result.timedOut) return { outcome: 'unfinished', failure: null }
    if (result.code !== 0)
      return {
        outcome: 'failed',
        failure: { command, output: result.output }
      }
  }
  return { outcome: 'passed', failure: null }
}
