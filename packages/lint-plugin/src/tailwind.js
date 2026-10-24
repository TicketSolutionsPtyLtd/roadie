import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import {
  MessageChannel,
  Worker,
  receiveMessageOnPort
} from 'node:worker_threads'

const ROADIE_CSS = '@oztix/roadie-core/css'
const TIMEOUT = 60_000

let channel
const stylesheets = new Map()
const answers = new Map()
const skipped = new Set()

function startWorker() {
  const { port1, port2 } = new MessageChannel()
  const signal = new Int32Array(new SharedArrayBuffer(4))
  // A flag such as --input-type stops the worker booting, and this thread,
  // blocked on its answer, would never hear why.
  const worker = new Worker(new URL('./tailwind-worker.js', import.meta.url), {
    execArgv: [],
    workerData: { port: port2, signal },
    transferList: [port2]
  })
  worker.unref()
  port1.unref()
  return { worker, port: port1, signal }
}

// Lint rules are synchronous and Tailwind loads its design system
// asynchronously, so a worker loads it and this thread blocks on the answer.
function ask(request) {
  channel ??= startWorker()
  const { port, signal } = channel
  Atomics.store(signal, 0, 0)
  port.postMessage(request)
  if (Atomics.wait(signal, 0, 0, TIMEOUT) === 'timed-out') {
    // Its late reply would answer the next request, so start a fresh worker.
    channel.worker.terminate()
    channel = undefined
    return null
  }
  const { result, error } = receiveMessageOnPort(port).message
  if (error) throw new Error(error)
  return result
}

function resolveRoadie(app) {
  try {
    return createRequire(`${app}/noop.js`).resolve(ROADIE_CSS)
  } catch {
    return undefined
  }
}

function roadieStylesheet(app) {
  if (!stylesheets.has(app)) stylesheets.set(app, resolveRoadie(app))
  return stylesheets.get(app)
}

/**
 * Tailwind's canonical form of each class, by Roadie's theme, resolved from
 * the linted file. Undefined where Roadie isn't installed, where Tailwind
 * isn't or predates canonical classes, or where it took over a minute to load.
 */
export function canonicalClasses(filename, classes) {
  const app = dirname(filename)
  const stylesheet = roadieStylesheet(app)
  if (!stylesheet || skipped.has(stylesheet)) return undefined
  if (!answers.has(stylesheet)) answers.set(stylesheet, new Map())
  const known = answers.get(stylesheet)
  const unknown = [...new Set(classes)].filter((name) => !known.has(name))
  if (unknown.length > 0) {
    const result = ask({ stylesheet, app, classes: unknown })
    if (!result) {
      // Skip the rest of the run rather than ask again for every file.
      skipped.add(stylesheet)
      return undefined
    }
    unknown.forEach((name, i) => known.set(name, result[i]))
  }
  return classes.map((name) => known.get(name))
}
