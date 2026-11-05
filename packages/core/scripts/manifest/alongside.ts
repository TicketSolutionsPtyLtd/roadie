import { spawn } from 'node:child_process'

function run(command: string) {
  const child = spawn(command, { shell: true, stdio: 'inherit' })
  return new Promise<number>((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
  })
}

/**
 * Starts `command`, does `work` while it runs, and settles once both finish:
 * with `work`'s result when the command succeeds, with the command's exit code
 * when it fails, or with `work`'s error after the command exits.
 */
export async function alongside<T>(
  command: string | undefined,
  work: () => T
): Promise<{ result: T; exitCode: 0 } | { exitCode: number }> {
  const running = command === undefined ? Promise.resolve(0) : run(command)
  let result: T
  try {
    result = work()
  } catch (error) {
    await running
    throw error
  }
  const exitCode = await running
  return exitCode === 0 ? { result, exitCode } : { exitCode }
}
