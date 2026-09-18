import {
  type ReactNode,
  StrictMode,
  Suspense,
  startTransition,
  use,
  useLayoutEffect,
  useRef
} from 'react'

import { act } from '@testing-library/react'
import { type Root, createRoot, hydrateRoot } from 'react-dom/client'
import {
  renderToReadableStream,
  renderToString,
  resume
} from 'react-dom/server'
import { prerender } from 'react-dom/static'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { Pane } from '../Pane'
import { columnTier, renderPaneColumnsCss } from '../Pane/paneColumns'
import {
  flushViewportMeasurement,
  paneColumnsRulesOf,
  paneRuleAt
} from './testUtils'

type Lib = { Navigator: typeof Navigator; Pane: typeof Pane }
const client: Lib = { Navigator, Pane }

// Fizz leaves context values behind in the realm it shares with the client, so
// the server renders from its own copy of Roadie, as a real server would.
async function server(): Promise<Lib> {
  vi.resetModules()
  const [{ Navigator: N }, { Pane: P }] = await Promise.all([
    import('.'),
    import('../Pane')
  ])
  return { Navigator: N, Pane: P }
}

const rules = paneColumnsRulesOf(renderPaneColumnsCss())
const WIDTHS = [24, columnTier(2), 60, columnTier(3), 100]

// A layout returns its pane and its children as siblings, as a route does.
const Layout = ({
  pane,
  children
}: {
  pane: ReactNode
  children?: ReactNode
}) => (
  <>
    {pane}
    {children}
  </>
)

const Shell = ({ lib, children }: { lib: Lib; children: ReactNode }) => (
  <StrictMode>
    <lib.Navigator value='/a'>
      <lib.Navigator.Content>{children}</lib.Navigator.Content>
    </lib.Navigator>
  </StrictMode>
)

type Thenable = Promise<void>
// React reads a settled promise's result off these without suspending.
const settle = (promise: Thenable) =>
  Object.assign(promise, { status: 'fulfilled', value: undefined })

function settled(): Thenable {
  return settle(Promise.resolve())
}

function later() {
  let resolve = () => {}
  const promise: Thenable = new Promise<void>((done) => {
    resolve = () => {
      settle(promise)
      done()
    }
  })
  return { promise, resolve }
}

const Wait = ({ on, children }: { on: Thenable; children: ReactNode }) => {
  use(on)
  return children
}

const stackPanes = (host: Element) =>
  Array.from(
    host.querySelectorAll<HTMLElement>('[data-slot="pane"][data-stack]')
  )
const depths = (host: Element) =>
  stackPanes(host).map((pane) => [pane.textContent, pane.dataset.depth])
const layoutOf = (host: Element) =>
  WIDTHS.map((width) =>
    stackPanes(host).map((pane) => paneRuleAt(rules, pane, width)?.body)
  )

async function readAll(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let html = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return html + decoder.decode()
    html += decoder.decode(value, { stream: true })
  }
}

// Inline scripts set through innerHTML never run; Fizz's reveal scripts must.
async function mount(html: string) {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  for (const script of host.querySelectorAll('script')) {
    new Function(script.textContent ?? '')()
  }
  await new Promise((done) => setTimeout(done, 400))
  return host
}

async function streamed(ui: ReactNode, resolve: () => void) {
  const stream = await renderToReadableStream(ui)
  setTimeout(resolve, 20)
  await stream.allReady
  return mount(await readAll(stream))
}

async function hydrate(
  host: HTMLElement,
  ui: ReactNode,
  during?: () => Promise<void>
) {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const recoverable = vi.fn()
  let root: Root | null = null
  await act(async () => {
    root = hydrateRoot(host, ui, { onRecoverableError: recoverable })
  })
  await during?.()
  await flushViewportMeasurement()
  const problems = {
    // Dev-only noise from shared external contexts (Base UI) in one realm.
    errors: error.mock.calls
      .map((call) => call.map(String).join(' '))
      .filter((message) => !message.includes('multiple renderers')),
    warnings: warn.mock.calls.map((call) => String(call[0])),
    recoverable: recoverable.mock.calls.length
  }
  error.mockRestore()
  warn.mockRestore()
  return { problems, unmount: () => act(() => root?.unmount()) }
}

const clean = { errors: [], warnings: [], recoverable: 0 }

afterEach(() => {
  document.body.replaceChildren()
})

describe('depth from render order', () => {
  const Three = ({ lib, hint }: { lib: Lib; hint?: boolean }) => (
    <Shell lib={lib}>
      <Layout pane={<lib.Pane column='list'>List</lib.Pane>}>
        <Layout pane={<lib.Pane>Event</lib.Pane>}>
          <lib.Pane depth={hint ? 2 : undefined}>Ticket</lib.Pane>
        </Layout>
      </Layout>
    </Shell>
  )

  it('draws the server HTML as a declared depth would, at every width', async () => {
    const lib = await server()
    const host = await mount(renderToString(<Three lib={lib} />))
    expect(depths(host)).toEqual([
      ['List', '0'],
      ['Event', '1'],
      ['Ticket', '2']
    ])
    const hinted = await mount(renderToString(<Three lib={lib} hint />))
    expect(layoutOf(host)).toEqual(layoutOf(hinted))
  })

  it('hydrates in StrictMode without a mismatch, a warning or a depth change', async () => {
    const host = await mount(renderToString(<Three lib={await server()} />))
    const before = depths(host)
    const { problems, unmount } = await hydrate(host, <Three lib={client} />)
    expect(problems).toEqual(clean)
    expect(depths(host)).toEqual(before)
    unmount()
  })

  it('writes a row of details from 1 and hydrates without moving a column', async () => {
    const Details = ({ lib }: { lib: Lib }) => (
      <Shell lib={lib}>
        <Layout pane={<lib.Pane>Event</lib.Pane>}>
          <lib.Pane>Ticket</lib.Pane>
        </Layout>
      </Shell>
    )
    const host = await mount(renderToString(<Details lib={await server()} />))
    expect(depths(host)).toEqual([
      ['Event', '1'],
      ['Ticket', '2']
    ])
    const served = layoutOf(host)
    const { problems, unmount } = await hydrate(host, <Details lib={client} />)
    expect(problems).toEqual(clean)
    expect(depths(host)).toEqual([
      ['Event', '0'],
      ['Ticket', '1']
    ])
    expect(layoutOf(host)).toEqual(served)
    unmount()
  })

  it('claims in the Content Navigator wraps around its children', async () => {
    const Implicit = ({ lib }: { lib: Lib }) => (
      <StrictMode>
        <lib.Navigator value='/a'>
          <Layout pane={<lib.Pane column='list'>List</lib.Pane>}>
            <Layout pane={<lib.Pane>Event</lib.Pane>}>
              <lib.Pane>Ticket</lib.Pane>
            </Layout>
          </Layout>
        </lib.Navigator>
      </StrictMode>
    )
    const host = await mount(renderToString(<Implicit lib={await server()} />))
    expect(depths(host).map(([, depth]) => depth)).toEqual(['0', '1', '2'])
    const { problems, unmount } = await hydrate(host, <Implicit lib={client} />)
    expect(problems).toEqual(clean)
    expect(depths(host).map(([, depth]) => depth)).toEqual(['0', '1', '2'])
    unmount()
  })

  it('counts the generated secondary list as the root', async () => {
    const WithSecondary = ({ lib }: { lib: Lib }) => (
      <StrictMode>
        <lib.Navigator value='/tickets/glamping/sam'>
          <lib.Navigator.Primary aria-label='Main'>
            <lib.Navigator.Item value='/tickets' href='/tickets'>
              Tickets
              <lib.Navigator.Secondary aria-label='Tickets'>
                <lib.Navigator.Item
                  value='/tickets/glamping'
                  href='/tickets/glamping'
                >
                  Glamping
                </lib.Navigator.Item>
              </lib.Navigator.Secondary>
            </lib.Navigator.Item>
          </lib.Navigator.Primary>
          <lib.Navigator.Content>
            <Layout pane={<lib.Pane>Event</lib.Pane>}>
              <lib.Pane>Ticket</lib.Pane>
            </Layout>
          </lib.Navigator.Content>
        </lib.Navigator>
      </StrictMode>
    )
    const host = await mount(
      renderToString(<WithSecondary lib={await server()} />)
    )
    expect(depths(host).map(([, depth]) => depth)).toEqual(['0', '1', '2'])
    const { problems, unmount } = await hydrate(
      host,
      <WithSecondary lib={client} />
    )
    expect(problems).toEqual(clean)
    expect(depths(host).map(([, depth]) => depth)).toEqual(['0', '1', '2'])
    unmount()
  })

  const Streamed = ({ lib, on }: { lib: Lib; on: Thenable }) => (
    <Shell lib={lib}>
      <Layout pane={<lib.Pane column='list'>List</lib.Pane>}>
        <Layout pane={<lib.Pane>Event</lib.Pane>}>
          <Suspense fallback={<lib.Pane pending>Loading</lib.Pane>}>
            <Wait on={on}>
              <lib.Pane>Ticket</lib.Pane>
            </Wait>
          </Suspense>
        </Layout>
      </Layout>
    </Shell>
  )

  it('follows document order when a route streams in behind its loading pane', async () => {
    const data = later()
    const host = await streamed(
      <Streamed lib={await server()} on={data.promise} />,
      data.resolve
    )
    expect(depths(host)).toEqual([
      ['List', '0'],
      ['Event', '1'],
      ['Ticket', '2']
    ])
    const { problems, unmount } = await hydrate(
      host,
      <Streamed lib={client} on={settled()} />
    )
    expect(problems).toEqual(clean)
    expect(depths(host)).toEqual([
      ['List', '0'],
      ['Event', '1'],
      ['Ticket', '2']
    ])
    unmount()
  })

  it('hydrates a boundary late, after the row has registered, at the served depth', async () => {
    const Late = ({ lib, on }: { lib: Lib; on: Thenable }) => (
      <Shell lib={lib}>
        <lib.Pane column='list'>List</lib.Pane>
        <Suspense fallback={null}>
          <Wait on={on}>
            <lib.Pane>Event</lib.Pane>
            <Suspense fallback={null}>
              <lib.Pane>Ticket</lib.Pane>
            </Suspense>
          </Wait>
        </Suspense>
      </Shell>
    )
    const host = await mount(
      renderToString(<Late lib={await server()} on={settled()} />)
    )
    expect(depths(host).map(([, depth]) => depth)).toEqual(['0', '1', '2'])
    const chunk = later()
    const { problems, unmount } = await hydrate(
      host,
      <Late lib={client} on={chunk.promise} />,
      async () => {
        await new Promise((done) => setTimeout(done, 50))
        await act(async () => chunk.resolve())
      }
    )
    expect(problems).toEqual(clean)
    expect(depths(host).map(([, depth]) => depth)).toEqual(['0', '1', '2'])
    unmount()
  })
})

describe('where render order is not document order', () => {
  // A fallback and the route it stands in for share a `useId` only when the
  // trees above their panes fork alike; this loading layout does not.
  const Loading = ({ lib, pending }: { lib: Lib; pending?: boolean }) => (
    <>
      <span hidden />
      <lib.Pane pending={pending}>Loading</lib.Pane>
    </>
  )
  const WithFallback = ({
    lib,
    on,
    pending
  }: {
    lib: Lib
    on: Thenable
    pending?: boolean
  }) => (
    <Shell lib={lib}>
      <lib.Pane column='list'>List</lib.Pane>
      <lib.Pane>Event</lib.Pane>
      <Suspense fallback={<Loading lib={lib} pending={pending} />}>
        <Wait on={on}>
          <lib.Pane>Ticket</lib.Pane>
        </Wait>
      </Suspense>
    </Shell>
  )

  it('counts a loading pane that does not pass pending, one too deep', async () => {
    const data = later()
    const host = await streamed(
      <WithFallback lib={await server()} on={data.promise} />,
      data.resolve
    )
    expect(depths(host)).toContainEqual(['Ticket', '3'])
    const { problems, unmount } = await hydrate(
      host,
      <WithFallback lib={client} on={settled()} />
    )
    expect(problems.errors.join('\n')).toMatch(/data-depth/)
    unmount()
  })

  it('skips a loading pane that passes pending', async () => {
    const data = later()
    const host = await streamed(
      <WithFallback lib={await server()} on={data.promise} pending />,
      data.resolve
    )
    expect(depths(host)).toContainEqual(['Ticket', '2'])
    const { problems, unmount } = await hydrate(
      host,
      <WithFallback lib={client} on={settled()} pending />
    )
    expect(problems).toEqual(clean)
    unmount()
  })

  it('misplaces a pane that suspends before its later sibling renders', async () => {
    const data = later()
    const Siblings = ({ lib, on }: { lib: Lib; on: Thenable }) => (
      <Shell lib={lib}>
        <lib.Pane column='list'>List</lib.Pane>
        <Suspense fallback={null}>
          <Wait on={on}>
            <lib.Pane>Event</lib.Pane>
          </Wait>
        </Suspense>
        <lib.Pane>Ticket</lib.Pane>
      </Shell>
    )
    const host = await streamed(
      <Siblings lib={await server()} on={data.promise} />,
      data.resolve
    )
    expect(depths(host)).toEqual([
      ['List', '0'],
      ['Event', '2'],
      ['Ticket', '1']
    ])
  })

  it('mismatches when sibling boundaries hydrate out of order', async () => {
    const Siblings = ({
      lib,
      first,
      second
    }: {
      lib: Lib
      first: Thenable
      second: Thenable
    }) => (
      <Shell lib={lib}>
        <lib.Pane column='list'>List</lib.Pane>
        <Suspense fallback={null}>
          <Wait on={first}>
            <lib.Pane>Event</lib.Pane>
          </Wait>
        </Suspense>
        <Suspense fallback={null}>
          <Wait on={second}>
            <lib.Pane>Ticket</lib.Pane>
          </Wait>
        </Suspense>
      </Shell>
    )
    const host = await mount(
      renderToString(
        <Siblings lib={await server()} first={settled()} second={settled()} />
      )
    )
    expect(depths(host).map(([, depth]) => depth)).toEqual(['0', '1', '2'])
    const first = later()
    const second = later()
    const { problems, unmount } = await hydrate(
      host,
      <Siblings lib={client} first={first.promise} second={second.promise} />,
      async () => {
        await act(async () => second.resolve())
        await new Promise((done) => setTimeout(done, 50))
        await act(async () => first.resolve())
      }
    )
    expect(problems.errors.join('\n')).toMatch(/data-depth/)
    unmount()
  })

  const Partial = ({
    lib,
    on,
    hint
  }: {
    lib: Lib
    on: Thenable
    hint?: boolean
  }) => (
    <Shell lib={lib}>
      <Layout pane={<lib.Pane column='list'>List</lib.Pane>}>
        <Layout pane={<lib.Pane>Event</lib.Pane>}>
          <Suspense fallback={null}>
            <Wait on={on}>
              <lib.Pane depth={hint ? 2 : undefined}>Ticket</lib.Pane>
            </Wait>
          </Suspense>
        </Layout>
      </Layout>
    </Shell>
  )

  // Partial prerendering: the shell is prerendered, the hole resumed later.
  // Resuming re-renders Navigator.Content but not the panes already in the
  // shell, so the hole's pane sees none before it.
  async function prerendered(hint: boolean) {
    const lib = await server()
    const data = later()
    const controller = new AbortController()
    const pending = prerender(
      <Partial lib={lib} on={data.promise} hint={hint} />,
      { signal: controller.signal, onError: () => {} }
    )
    await new Promise((done) => setTimeout(done, 20))
    controller.abort()
    const { prelude, postponed } = await pending
    const shell = await readAll(prelude)
    expect(postponed).not.toBeNull()
    data.resolve()
    const rest = await resume(
      <Partial lib={lib} on={data.promise} hint={hint} />,
      postponed!
    )
    await rest.allReady
    return mount(shell + (await readAll(rest)))
  }

  it('writes a resumed pane as if it were first', async () => {
    const host = await prerendered(false)
    expect(depths(host)).toEqual([
      ['List', '0'],
      ['Event', '1'],
      ['Ticket', '1']
    ])
    const { problems, unmount } = await hydrate(
      host,
      <Partial lib={client} on={settled()} />
    )
    expect(problems.errors.join('\n')).toMatch(/data-depth/)
    unmount()
  })

  it('still takes a declared depth for a resumed pane', async () => {
    const host = await prerendered(true)
    expect(depths(host)).toContainEqual(['Ticket', '2'])
    const { problems, unmount } = await hydrate(
      host,
      <Partial lib={client} on={settled()} hint />
    )
    expect(problems).toEqual(clean)
    unmount()
  })
})

describe('a pane the client mounts', () => {
  // Outside act, so React schedules as it does in a browser: the only frames
  // that can paint are the ones a task leaves behind.
  function withoutAct() {
    const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    const was = scope.IS_REACT_ACT_ENVIRONMENT
    scope.IS_REACT_ACT_ENVIRONMENT = false
    return () => {
      scope.IS_REACT_ACT_ENVIRONMENT = was
    }
  }
  const idle = () => new Promise((done) => setTimeout(done, 50))

  it('is at its place in the first frame the browser can paint', async () => {
    const restore = withoutAct()
    const painted: (string | undefined)[] = []
    function Probe() {
      const ref = useRef<HTMLSpanElement>(null)
      useLayoutEffect(() => {
        // Runs once the commit's synchronous work is done, before any paint.
        queueMicrotask(() => {
          const pane = ref.current?.closest<HTMLElement>('[data-slot="pane"]')
          painted.push(pane?.dataset.depth)
        })
      }, [])
      return <span ref={ref} />
    }
    const App = ({ deep }: { deep: boolean }) => (
      <Shell lib={client}>
        <Pane column='list'>List</Pane>
        <Pane>Event</Pane>
        {deep ? (
          <Pane>
            <Probe />
          </Pane>
        ) : null}
      </Shell>
    )
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    root.render(<App deep={false} />)
    await idle()
    startTransition(() => root.render(<App deep />))
    await idle()
    expect(painted.length).toBeGreaterThan(0)
    expect(new Set(painted)).toEqual(new Set(['2']))
    root.unmount()
    restore()
  })
})
