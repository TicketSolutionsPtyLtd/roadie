import { execFileSync, spawn } from 'node:child_process'
import { connect, createServer } from 'node:net'
import { constants, networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import {
  killGroup,
  repoRoot,
  waitForLoad,
  warnIfLowDisk
} from './lib/machine.mjs'

const portRange = process.env.ROADIE_PORT_RANGE || '3000-3099'
const [, firstPort, lastPort] = (portRange.match(/^(\d+)-(\d+)$/) ?? []).map(
  Number
)
if (!(firstPort > 0 && firstPort <= lastPort && lastPort <= 65535)) {
  console.error(
    `ROADIE_PORT_RANGE must look like 3100-3199, low to high. Got "${portRange}".`
  )
  process.exit(2)
}

function bindsOnAllInterfaces(port) {
  return new Promise((resolve) => {
    const server = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => server.close(() => resolve(true)))
      .listen(port, '0.0.0.0')
  })
}

// A wildcard bind succeeds beside a loopback-only listener, so connect too.
function acceptsConnections(port, host) {
  return new Promise((resolve) => {
    const socket = connect({ port, host, timeout: 500 })
    const finish = (accepted) => {
      socket.destroy()
      resolve(accepted)
    }
    socket
      .once('connect', () => finish(true))
      .once('error', () => finish(false))
      .once('timeout', () => finish(false))
  })
}

async function portIsFree(port) {
  return (
    (await bindsOnAllInterfaces(port)) &&
    !(await acceptsConnections(port, '127.0.0.1')) &&
    !(await acceptsConnections(port, '::1'))
  )
}

async function freePort() {
  for (let port = firstPort; port <= lastPort; port++) {
    if (await portIsFree(port)) return port
  }
  throw new Error(`No free port in ${firstPort}-${lastPort}.`)
}

function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((address) => address.family === 'IPv4' && !address.internal)
    .map((address) => address.address)
}

function tailscaleName() {
  try {
    const status = JSON.parse(
      execFileSync('tailscale', ['status', '--json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      })
    )
    return status.Self?.Online ? status.Self.DNSName.replace(/\.$/, '') : null
  } catch {
    return null
  }
}

warnIfLowDisk()
await waitForLoad()

console.log('Building the packages the docs read from dist.')
execFileSync(
  'pnpm',
  ['turbo', 'run', 'build', '--filter=docs^...', '--output-logs=errors-only'],
  {
    cwd: repoRoot,
    stdio: 'inherit'
  }
)

const port = await freePort()
const extraHosts = (process.env.NEXT_DEV_ORIGINS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)
const hosts = [
  ...new Set(
    [tailscaleName(), ...extraHosts, ...lanAddresses()].filter(Boolean)
  )
]

const server = spawn(
  'pnpm',
  ['exec', 'next', 'dev', '--hostname', '0.0.0.0', '--port', String(port)],
  {
    cwd: join(repoRoot, 'docs'),
    env: { ...process.env, NEXT_DEV_ORIGINS: hosts.join(',') },
    detached: true,
    stdio: ['ignore', 'inherit', 'inherit']
  }
)

const stopServer = (signal) => killGroup(server.pid, signal)
let receivedSignal = null
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    receivedSignal = signal
    stopServer(signal)
  })
}
server.on('exit', (code, signal) => {
  stopServer('SIGKILL')
  const stoppedBy = receivedSignal ?? signal
  process.exit(stoppedBy ? 128 + constants.signals[stoppedBy] : (code ?? 0))
})

async function serverIsUp() {
  for (let attempt = 0; attempt < 180; attempt++) {
    const response = await fetch(`http://127.0.0.1:${port}/`).catch(() => null)
    if (response && response.status < 500) return true
    await sleep(1000)
  }
  return false
}

if (!(await serverIsUp())) {
  console.error('The docs server did not answer within 3 minutes.')
  stopServer('SIGTERM')
  process.exit(1)
}

const urls = [
  `http://localhost:${port}/`,
  ...hosts
    .filter((host) => !host.includes('*'))
    .map((host) => `http://${host}:${port}/`)
]
console.log(
  `\nPreview ready (pid ${process.pid}, stop with \`kill ${process.pid}\`):\n${urls.join('\n')}\n`
)
