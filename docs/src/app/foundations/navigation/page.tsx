import type { ReactNode } from 'react'

import Link from 'next/link'

import { CodePreview } from '@/components/CodePreview'
import { Guideline } from '@/components/Guideline'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Navigation',
  description:
    'How Navigator and Pane fit together: four parts, one pane per URL level, and nested layouts that render them',
  category: 'Building apps'
}

const smallestShell = `<Navigator value={pathname}>
  <Navigator.Primary aria-label='Account'>
    <Navigator.Item value='/account/tickets' href='/account/tickets' icon={<TicketIcon />}>
      Tickets
    </Navigator.Item>
    <Navigator.Item value='/account/settings' href='/account/settings' icon={<GearIcon />}>
      Settings
      <Navigator.Secondary aria-label='Settings pages'>
        <Navigator.Item value='/account/settings/profile' href='/account/settings/profile'>
          Profile
        </Navigator.Item>
      </Navigator.Secondary>
    </Navigator.Item>
  </Navigator.Primary>
  <Pane>
    <Pane.Header>
      <Pane.Title>Tickets</Pane.Title>
    </Pane.Header>
  </Pane>
</Navigator>`

const destinationsExample = `const titles = {
  '/account/tickets': 'Tickets',
  '/account/orders': 'Orders'
}

function Destinations() {
  return (
    <div className='h-[30rem] overflow-hidden rounded-2xl border border-subtle'>
      <DemoRouter initialPath='/account/tickets'>
        {(path) => (
          <Navigator value={path} className='h-full'>
            <Navigator.Primary aria-label='Account'>
              <Navigator.Item value='/account/tickets' href='/account/tickets' icon={<TicketIcon />}>
                Tickets
              </Navigator.Item>
              <Navigator.Item value='/account/orders' href='/account/orders' icon={<ShoppingCartIcon />}>
                Orders
              </Navigator.Item>
            </Navigator.Primary>
            <Pane>
              <Pane.Header>
                <Pane.Title>{titles[path]}</Pane.Title>
              </Pane.Header>
              <p className='pb-4 text-subtle'>The page at {path}.</p>
            </Pane>
          </Navigator>
        )}
      </DemoRouter>
    </div>
  )
}
render(<Destinations />)`

const secondaryExample = `const titles = {
  '/account/tickets': 'Tickets',
  '/account/orders': 'Orders',
  '/account/settings': 'Settings',
  '/account/settings/profile': 'Profile',
  '/account/settings/payment': 'Payment',
  '/account/settings/notifications': 'Notifications'
}

function SecondaryNav() {
  return (
    <div className='h-[30rem] overflow-hidden rounded-2xl border border-subtle'>
      <DemoRouter initialPath='/account/settings/profile'>
        {(path) => (
          <Navigator value={path} className='h-full'>
            <Navigator.Primary aria-label='Account'>
              <Navigator.Item value='/account/tickets' href='/account/tickets' icon={<TicketIcon />}>
                Tickets
              </Navigator.Item>
              <Navigator.Item value='/account/orders' href='/account/orders' icon={<ShoppingCartIcon />}>
                Orders
              </Navigator.Item>
              <Navigator.Item value='/account/settings' href='/account/settings' icon={<GearIcon />}>
                Settings
                <Navigator.Secondary aria-label='Settings pages'>
                  <Navigator.Item value='/account/settings/profile' href='/account/settings/profile'>
                    Profile
                  </Navigator.Item>
                  <Navigator.Item value='/account/settings/payment' href='/account/settings/payment'>
                    Payment
                  </Navigator.Item>
                  <Navigator.Item value='/account/settings/notifications' href='/account/settings/notifications'>
                    Notifications
                  </Navigator.Item>
                </Navigator.Secondary>
              </Navigator.Item>
            </Navigator.Primary>
            <Pane>
              <Pane.Header>
                <Pane.Title>{titles[path]}</Pane.Title>
              </Pane.Header>
              <p className='pb-4 text-subtle'>The page at {path}.</p>
            </Pane>
          </Navigator>
        )}
      </DemoRouter>
    </div>
  )
}
render(<SecondaryNav />)`

const accountRail = `            <Navigator.Primary aria-label='Account'>
              <Navigator.Item value='/account/tickets' href='/account/tickets' icon={<TicketIcon />}>
                Tickets
              </Navigator.Item>
              <Navigator.Item value='/account/orders' href='/account/orders' icon={<ShoppingCartIcon />}>
                Orders
              </Navigator.Item>
              <Navigator.Item value='/account/settings' href='/account/settings' icon={<GearIcon />}>
                Settings
                <Navigator.Secondary aria-label='Settings pages'>
                  <Navigator.Item value='/account/settings/profile' href='/account/settings/profile'>
                    Profile
                  </Navigator.Item>
                  <Navigator.Item value='/account/settings/payment' href='/account/settings/payment'>
                    Payment
                  </Navigator.Item>
                </Navigator.Secondary>
              </Navigator.Item>
            </Navigator.Primary>`

const pagePane = `const titles = {
  '/account/orders': 'Orders',
  '/account/settings': 'Settings',
  '/account/settings/profile': 'Profile',
  '/account/settings/payment': 'Payment'
}

function PagePane({ path }) {
  return (
    <Pane>
      <Pane.Header>
        <Pane.Title>{titles[path]}</Pane.Title>
      </Pane.Header>
      <p className='pb-4 text-subtle'>The page at {path}.</p>
    </Pane>
  )
}

function TicketsPane({ eventId }) {
  return (
    <Pane column='list'>
      <Pane.Header>
        <Pane.Title>Tickets</Pane.Title>
      </Pane.Header>
      <List>
        {events.map((event) => (
          <List.Item
            key={event.id}
            href={\`/account/tickets/\${event.id}\`}
            title={event.title}
            description={event.when}
            current={event.id === eventId}
            chevron
          />
        ))}
      </List>
    </Pane>
  )
}`

const drillDownExample = `const events = [
  { id: 'beef-week-glamping-4821', title: 'Beef Week glamping', when: 'Mon 5 May · Rockhampton' },
  { id: 'midnight-frequency-1377', title: 'Midnight Frequency', when: 'Sat 12 Jul · The Tivoli' }
]

${pagePane}

function EventPane({ event }) {
  return (
    <Pane>
      <Pane.Header backHref='/account/tickets' backLabel='Tickets'>
        <Pane.Title>{event.title}</Pane.Title>
      </Pane.Header>
      <p className='pb-4 text-subtle'>{event.when}</p>
    </Pane>
  )
}

function DrillDown() {
  return (
    <div className='h-[30rem] overflow-hidden rounded-2xl border border-subtle'>
      <DemoRouter initialPath='/account/tickets'>
        {(path) => {
          const [, , destination, eventId] = path.split('/')
          const event = events.find(({ id }) => id === eventId)
          return (
            <Navigator value={path} className='h-full'>
${accountRail}
              {destination === 'tickets' ? (
                <>
                  <TicketsPane eventId={eventId} />
                  {event && <EventPane event={event} />}
                </>
              ) : (
                <PagePane path={path} />
              )}
            </Navigator>
          )
        }}
      </DemoRouter>
    </div>
  )
}
render(<DrillDown />)`

const threePaneExample = `const events = [
  {
    id: 'beef-week-glamping-4821',
    title: 'Beef Week glamping',
    when: 'Mon 5 May · Rockhampton',
    tickets: [
      { id: 'tk-9f2c1a', title: 'Bell tent for two', detail: 'Site 14 · check in from 2 pm' },
      { id: 'tk-4e81d7', title: 'Breakfast pack', detail: 'Collect from the mess tent' }
    ]
  },
  {
    id: 'midnight-frequency-1377',
    title: 'Midnight Frequency',
    when: 'Sat 12 Jul · The Tivoli',
    tickets: [
      { id: 'tk-2c55b0', title: 'General admission', detail: 'Doors 7 pm' }
    ]
  }
]

${pagePane}

function EventPane({ event, ticketId }) {
  return (
    <Pane>
      <Pane.Header backHref='/account/tickets' backLabel='Tickets'>
        <Pane.Title>{event.title}</Pane.Title>
      </Pane.Header>
      <List>
        {event.tickets.map((ticket) => (
          <List.Item
            key={ticket.id}
            href={\`/account/tickets/\${event.id}/\${ticket.id}\`}
            title={ticket.title}
            description={ticket.detail}
            current={ticket.id === ticketId}
            chevron
          />
        ))}
      </List>
    </Pane>
  )
}

function TicketPane({ event, ticket }) {
  return (
    <Pane>
      <Pane.Header backHref={\`/account/tickets/\${event.id}\`} backLabel={event.title}>
        <Pane.Title>{ticket.title}</Pane.Title>
      </Pane.Header>
      <p className='pb-4 text-subtle'>{ticket.detail}</p>
    </Pane>
  )
}

function ThreePanes() {
  return (
    <div className='h-[30rem] overflow-hidden rounded-2xl border border-subtle'>
      <DemoRouter initialPath='/account/tickets'>
        {(path) => {
          const [, , destination, eventId, ticketId] = path.split('/')
          const event = events.find(({ id }) => id === eventId)
          const ticket = event?.tickets.find(({ id }) => id === ticketId)
          return (
            <Navigator value={path} className='h-full'>
${accountRail}
              {destination === 'tickets' ? (
                <>
                  <TicketsPane eventId={eventId} />
                  {event && <EventPane event={event} ticketId={ticketId} />}
                  {ticket && <TicketPane event={event} ticket={ticket} />}
                </>
              ) : (
                <PagePane path={path} />
              )}
            </Navigator>
          )
        }}
      </DemoRouter>
    </div>
  )
}
render(<ThreePanes />)`

const fileTree = `app/account/
├─ layout.tsx          the shell, with Navigator and its destinations
└─ tickets/
   ├─ layout.tsx       the tickets pane, then {children}
   ├─ page.tsx         null
   └─ [event]/
      ├─ layout.tsx    the event pane, then {children}
      ├─ page.tsx      null
      └─ [ticket]/
         └─ page.tsx   the ticket pane`

const urlPanes = [
  { url: '/account/tickets', panes: 'Tickets' },
  {
    url: '/account/tickets/beef-week-glamping-4821',
    panes: 'Tickets, Beef Week glamping'
  },
  {
    url: '/account/tickets/beef-week-glamping-4821/tk-9f2c1a',
    panes: 'Tickets, Beef Week glamping, Bell tent for two'
  }
]

const shellLayout = `// app/account/layout.tsx
'use client'

import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import { Navigator } from '@oztix/roadie-components/navigator'
import { ShoppingCartIcon, TicketIcon } from '@phosphor-icons/react'

export default function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <Navigator value={pathname} className='h-dvh'>
      <Navigator.Primary aria-label='Account'>
        <Navigator.Item value='/account/tickets' href='/account/tickets' icon={<TicketIcon />}>
          Tickets
        </Navigator.Item>
        <Navigator.Item value='/account/orders' href='/account/orders' icon={<ShoppingCartIcon />}>
          Orders
        </Navigator.Item>
      </Navigator.Primary>
      {children}
    </Navigator>
  )
}`

const paneLayout = `// app/account/tickets/TicketsPane.tsx
export function TicketsPane() {
  return (
    <Pane column='list'>
      <Pane.Header>
        <Pane.Title>Tickets</Pane.Title>
      </Pane.Header>
      <TicketList />
    </Pane>
  )
}

// app/account/tickets/layout.tsx
export default function TicketsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TicketsPane />
      {children}
    </>
  )
}

// app/account/tickets/[event]/layout.tsx
export default function EventLayout({ children, params }: EventLayoutProps) {
  return (
    <>
      <EventPane params={params} />
      {children}
    </>
  )
}

// app/account/tickets/[event]/[ticket]/page.tsx
export default function TicketPage({ params }: TicketPageProps) {
  return <TicketPane params={params} />
}`

const nullPage = `// app/account/tickets/page.tsx
export default function TicketsPage() {
  return null // The tickets pane comes from layout.tsx.
}`

const splitRows: { piece: ReactNode; must: string; why: string }[] = [
  {
    piece: (
      <>
        The shell layout, <Code>Navigator</Code>, <Code>Navigator.Primary</Code>{' '}
        and everything inside it
      </>
    ),
    must: 'Client',
    why: 'Navigator finds its parts by element reference. A server component replaces those references, so items, groups and menus silently disappear.'
  },
  {
    piece: <Code>Navigator.Content</Code>,
    must: 'Server-safe',
    why: 'Optional. Navigator wraps its other children in it for you.'
  },
  {
    piece: (
      <>
        <Code>Pane</Code> and everything in it
      </>
    ),
    must: 'Server-safe',
    why: 'This is what lets each route layout stay a plain server component.'
  }
]

const railsCode = `// app/user/[user]/layout.tsx
export default async function UserLayout({ children, params }: UserLayoutProps) {
  const { user } = await params
  return (
    <AppNavigator kind='user' base={\`/user/\${user}\`}>
      {children}
    </AppNavigator>
  )
}

// components/AppNavigator.tsx
'use client'

export function AppNavigator({ kind, base, children }: AppNavigatorProps) {
  const pathname = usePathname()

  return (
    <Navigator value={pathname} className='h-dvh'>
      {kind === 'org' ? orgRail(base) : userRail(base)}
      {children}
    </Navigator>
  )
}

function userRail(base: string) {
  return (
    <Navigator.Primary aria-label='Account'>
      <Navigator.Item value={\`\${base}/tickets\`} href={\`\${base}/tickets\`} icon={<TicketIcon />}>
        Tickets
      </Navigator.Item>
    </Navigator.Primary>
  )
}`

const awaitInside = `export default function TicketPage({ params }: TicketPageProps) {
  return (
    <Pane>
      <Pane.Header>
        <Pane.Title>Ticket</Pane.Title>
      </Pane.Header>
      <Pane.Body loading={<TicketSkeleton />}>
        <TicketDetail params={params} />
      </Pane.Body>
    </Pane>
  )
}

async function TicketDetail({ params }: TicketPageProps) {
  const ticket = await getTicket((await params).ticket)
  return <TicketSummary ticket={ticket} />
}`

const awaitAbove = `export default async function TicketPage({ params }: TicketPageProps) {
  const ticket = await getTicket((await params).ticket)
  return (
    <Pane>
      <Pane.Header>
        <Pane.Title>{ticket.title}</Pane.Title>
      </Pane.Header>
      <TicketSummary ticket={ticket} />
    </Pane>
  )
}`

const pendingCode = `const { start, stop } = usePendingNavigation()

const buy = async () => {
  start()
  try {
    await reserve()
    router.push('/checkout')
  } catch {
    stop()
  }
}`

const urlFlags = `'use client'

import { Suspense, useEffect, useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Navigator } from '@oztix/roadie-components/navigator'

type NavQuery = { nav: boolean; more: boolean }

function NavQueryFlags({ onChange }: { onChange: (next: NavQuery) => void }) {
  const params = useSearchParams()
  const nav = params.has('nav')
  const more = params.has('more')
  useEffect(() => onChange({ nav, more }), [nav, more, onChange])
  return null
}

export function AppNavigator() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState<NavQuery>({ nav: false, more: false })
  const toggle = (param: string) => (next: boolean) => {
    const params = new URLSearchParams(window.location.search)
    params.delete(param)
    const search = [params.toString(), next ? param : '']
      .filter(Boolean)
      .join('&')
    router.push(search ? \`\${pathname}?\${search}\` : pathname, { scroll: false })
  }

  return (
    <>
      <Suspense fallback={null}>
        <NavQueryFlags onChange={setQuery} />
      </Suspense>
      <Navigator
        value={pathname}
        showList={query.nav}
        onShowListChange={toggle('nav')}
        showMore={query.more}
        onShowMoreChange={toggle('more')}
      >
        …
      </Navigator>
    </>
  )
}`

const withoutFramework = `const NavigateContext = createContext<(path: string) => void>(() => {})

const isPlainClick = (event: React.MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

function AppLink({ href, onClick, ...props }: RoadieLinkProps) {
  const navigate = use(NavigateContext)
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !isPlainClick(event)) return
        event.preventDefault()
        navigate(href)
      }}
    />
  )
}

function App() {
  const [path, setPath] = useState('/account/tickets')

  return (
    <RoadieLinkProvider Link={AppLink}>
      <NavigateContext value={setPath}>
        <Navigator value={path} onValueChange={setPath}>
          <Navigator.Primary aria-label='Account'>…</Navigator.Primary>
          {panesFor(path)}
        </Navigator>
      </NavigateContext>
    </RoadieLinkProvider>
  )
}`

const reachedExample = `const events = [
  { id: 'beef-week-glamping-4821', title: 'Beef Week glamping', when: 'Mon 5 May · Rockhampton' },
  { id: 'midnight-frequency-1377', title: 'Midnight Frequency', when: 'Sat 12 Jul · The Tivoli' }
]

function EmptyDetail() {
  const [selected, setSelected] = useState(null)
  const event = events.find(({ id }) => id === selected)
  return (
    <div className='h-[30rem] overflow-hidden rounded-2xl border border-subtle'>
      <Navigator className='h-full'>
        <Pane column='list'>
          <Pane.Header>
            <Pane.Title>Tickets</Pane.Title>
          </Pane.Header>
          <List>
            {events.map((e) => (
              <List.Item
                key={e.id}
                title={e.title}
                description={e.when}
                current={e.id === selected}
                onClick={() => setSelected(e.id)}
                chevron
              />
            ))}
          </List>
        </Pane>
        <Pane reached={event != null}>
          <Pane.Header onBack={() => setSelected(null)} backLabel='Tickets'>
            <Pane.Title>{event ? event.title : 'No event chosen'}</Pane.Title>
          </Pane.Header>
          <p className='pb-4 text-subtle'>
            {event ? event.when : 'Pick an event from the list.'}
          </p>
        </Pane>
      </Navigator>
    </div>
  )
}
render(<EmptyDetail />)`

const interceptionReasons = [
  'Under nested layouts the depth is in the URL, so there is one thing to reason about. Interception gives one URL two meanings.',
  'A reload and a click agree. Interception exists because they don’t. The deep URL resolves to a standalone twin, which renders one pane unless you rebuild the stack in it by hand.',
  'There are no duplicate route files, no default.tsx and no null catch-all. Interception needs all three.',
  'The reference app landed here after trying interception first.',
  'Next rejects intercepting routes under static export, so these docs could never demo them. Nested layouts demo fine.'
]

function CodeBlock({ children }: { children: string }) {
  return (
    <div className='overflow-x-auto rounded-xl emphasis-sunken p-4'>
      <pre className='font-mono text-xs leading-relaxed text-normal'>
        {children}
      </pre>
    </div>
  )
}

function DiagramBox({
  name,
  caption,
  className,
  children
}: {
  name: string
  caption: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={`grid content-start gap-2 rounded-xl border border-normal p-3 ${className ?? ''}`}
    >
      <p className='grid gap-0.5'>
        <span className='font-mono text-xs text-strong'>{name}</span>
        <span className='text-xs text-subtle'>{caption}</span>
      </p>
      {children}
    </div>
  )
}

function Chips({ labels }: { labels: string[] }) {
  return (
    <ul className='flex flex-wrap gap-1'>
      {labels.map((label) => (
        <li
          key={label}
          className='rounded-full emphasis-subtle px-2 py-0.5 text-xs'
        >
          {label}
        </li>
      ))}
    </ul>
  )
}

function ModelDiagram() {
  return (
    <figure className='@container grid gap-3'>
      <DiagramBox
        name='Navigator'
        caption='The app frame. You give it the current route.'
        className='bg-sunken'
      >
        <div className='grid gap-3 @xl:grid-cols-[minmax(0,15rem)_1fr]'>
          <DiagramBox
            name='Navigator.Primary'
            caption='The top-level destinations'
            className='bg-raised'
          >
            <Chips labels={['Tickets', 'Orders', 'Settings']} />
            <DiagramBox
              name='Navigator.Secondary'
              caption='The pages inside one destination'
            >
              <Chips labels={['Profile', 'Payment']} />
            </DiagramBox>
          </DiagramBox>
          <div className='grid grid-cols-3 gap-2'>
            {['Tickets', 'An event', 'A ticket'].map((label) => (
              <DiagramBox
                key={label}
                name='Pane'
                caption={label}
                className='min-h-24 bg-raised'
              />
            ))}
          </div>
        </div>
      </DiagramBox>
      <figcaption className='text-sm text-subtle'>
        Navigator holds the destinations and the panes. Each URL level adds one
        pane beside the last.
      </figcaption>
    </figure>
  )
}

function Table({
  head,
  rows
}: {
  head: string[]
  rows: { key: string; cells: ReactNode[] }[]
}) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-subtle text-left'>
            {head.map((cell) => (
              <th key={cell} className='py-2 pr-4 font-semibold'>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-subtler'>
          {rows.map(({ key, cells }) => (
            <tr key={key}>
              {cells.map((cell, index) => (
                <td
                  key={index}
                  className={`py-2 pr-4 align-top ${index === 0 ? 'text-strong' : 'text-subtle'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function NavigationPage() {
  return (
    <div className='grid gap-12'>
      <p className='text-lg text-subtle'>
        <Code>Navigator</Code> draws your app&apos;s destinations and lays out
        its <Code>Pane</Code>s. Each level of the URL adds one pane, and nested
        layouts render them.
      </p>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>The model</h2>
        <p className='text-subtle'>
          Navigation has four parts, and each is a component you type.
        </p>
        <ModelDiagram />
        <ul className='grid list-disc gap-1 pl-5 text-subtle'>
          <li>
            <Code>Navigator</Code> is the app frame. You give it the current
            route as <Code>value</Code>.
          </li>
          <li>
            <Code>Navigator.Primary</Code> holds the top-level destinations.
          </li>
          <li>
            <Code>Navigator.Secondary</Code> holds the pages inside one
            destination.
          </li>
          <li>
            <Code>Pane</Code> is a column of content.
          </li>
        </ul>
        <p className='text-subtle'>
          <Code>Navigator.Item</Code> is a destination, in either nav.
        </p>
        <CodePreview>{smallestShell}</CodePreview>
        <p className='text-subtle'>
          One URL level is one pane. <Code>/account/tickets</Code> is one pane,{' '}
          <Code>/account/tickets/beef-week-glamping-4821</Code> is two, and{' '}
          <Code>/account/tickets/beef-week-glamping-4821/tk-9f2c1a</Code> is
          three. Roadie reads each pane&apos;s depth from the order the panes
          render in.
        </p>
        <p className='text-subtle'>Everything else is automatic or opt-in.</p>
        <ul className='grid list-disc gap-1 pl-5 text-subtle'>
          <li>Destinations that don&apos;t fit fold into More.</li>
          <li>
            A destination can open a <Code>Navigator.Menu</Code> instead of
            navigating.
          </li>
          <li>
            The secondary nav&apos;s list pane is generated.{' '}
            <Code>Navigator.SecondaryPane</Code> replaces it with your own.
          </li>
        </ul>
        <p className='text-subtle'>
          A shell has at most one list pane, any number of detail panes and at
          most one inspector. <Code>column</Code> says which one a pane is, and
          it defaults to <Code>detail</Code>. A shell with no list is normal.
          This docs site is a single detail pane.
        </p>
        <p className='text-subtle'>
          There is no tertiary level. A secondary nav can&apos;t hold another
          one, and a pane at depth 2 is just a pane.
        </p>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Build it up</h2>
        <p className='text-subtle'>
          Each example adds one idea to the one before it.{' '}
          <Code>DemoRouter</Code> is a docs-only router. It keeps the path in
          state and gives it to the render function, the way a layout gets it
          from your framework. Press Full width to see the panes as columns, and
          narrow the window to see the tab bar and the stacked panes.
        </p>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>Destinations</h3>
          <p className='text-subtle'>
            Two destinations and one pane that shows the current page.
          </p>
          <CodePreview language='tsx-live-noinline' expandable>
            {destinationsExample}
          </CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>A secondary nav</h3>
          <p className='text-subtle'>
            Put a <Code>Navigator.Secondary</Code> inside Settings. Navigator
            generates its list pane, beside your page where two columns fit and
            behind it when panes stack. Your code still renders one pane.
          </p>
          <CodePreview language='tsx-live-noinline' expandable>
            {secondaryExample}
          </CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>A drill-down</h3>
          <p className='text-subtle'>
            Under Tickets, the path picks the panes. The list is always there,
            and an event adds a second pane after it. Choose an event, then use
            Back.
          </p>
          <CodePreview language='tsx-live-noinline' expandable>
            {drillDownExample}
          </CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            A three-pane drill-down
          </h3>
          <p className='text-subtle'>
            A ticket adds a third pane. Nothing declares a depth. Each pane
            takes the next one because it renders after the last. Choose an
            event, then a ticket.
          </p>
          <CodePreview language='tsx-live-noinline' expandable>
            {threePaneExample}
          </CodePreview>
        </div>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Map it to routes</h2>
        <p className='text-subtle'>
          Use nested layouts. Each route layout renders its own pane, then{' '}
          <Code>{'{children}'}</Code>. A URL renders exactly the panes its depth
          implies, whether you click to it or reload it.
        </p>
        <CodeBlock>{fileTree}</CodeBlock>
        <Table
          head={['URL', 'Panes']}
          rows={urlPanes.map(({ url, panes }) => ({
            key: url,
            cells: [<Code key='url'>{url}</Code>, panes]
          }))}
        />

        <div className='grid gap-2'>
          <h3 id='the-shell' className='text-display-ui-5 text-strong'>
            The shell
          </h3>
          <p className='text-subtle'>
            The top layout is a client component. It passes{' '}
            <Code>usePathname()</Code> as <Code>value</Code>, so the nav and the
            panes read the same route. Mount{' '}
            <Link href='/foundations/linking'>RoadieLinkProvider</Link> once at
            the app root, so every <Code>href</Code> stays a client navigation.
          </p>
          <CodePreview>{shellLayout}</CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>The fragment rule</h3>
          <p className='text-subtle'>
            A layout returns its pane and <Code>{'{children}'}</Code> in a
            fragment. The fragment adds no element, so every pane lands as a
            sibling of the others and Roadie reads the depth from their order.
            Wrap them in a <Code>div</Code> and the columns break.
          </p>
          <CodePreview>{paneLayout}</CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>The empty page</h3>
          <p className='text-subtle'>
            A level whose pane comes from its layout still needs a{' '}
            <Code>page.tsx</Code> for the URL to exist. It returns{' '}
            <Code>null</Code>. This is the cost of nested layouts, one line and
            one comment per level.
          </p>
          <CodePreview>{nullPage}</CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3 id='server-and-client' className='text-display-ui-5 text-strong'>
            Server and client
          </h3>
          <Table
            head={['Piece', 'Must be', 'Why']}
            rows={splitRows.map(({ piece, must, why }) => ({
              key: must + why,
              cells: [piece, must, why]
            }))}
          />
          <p className='text-subtle'>
            <Code>Navigator.Primary</Code> must be a direct child of{' '}
            <Code>Navigator</Code>. Your own component around it hides it. See{' '}
            <Link href='/components/navigator#splitting-a-big-tree'>
              splitting a big tree
            </Link>
            .
          </p>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            One shell, many rails
          </h3>
          <p className='text-subtle'>
            An app with several trees, such as <Code>/user</Code> and{' '}
            <Code>/orgs</Code>, can share one shell. It takes a{' '}
            <Code>kind</Code> and a <Code>base</Code> path. Each rail is a
            function the shell calls, not a component it renders, so{' '}
            <Code>Navigator.Primary</Code> stays a direct child. Views take the
            same base path, so one tickets view serves both trees.
          </p>
          <CodePreview>{railsCode}</CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3
            id='keep-the-list-and-more-in-the-url'
            className='text-display-ui-5 text-strong'
          >
            Keep the list and More in the URL
          </h3>
          <p className='text-subtle'>
            Roadie never reads the URL. To let a phone user open a
            destination&apos;s list, or More, from a link or with Back, keep a
            flag such as <Code>?nav</Code> or <Code>?more</Code> in the query
            string and pass it to <Code>showList</Code> and{' '}
            <Code>showMore</Code>. The{' '}
            <Link href='/components/navigator#keep-the-list-and-more-in-the-url'>
              Navigator reference
            </Link>{' '}
            covers the props.
          </p>
          <ul className='grid list-disc gap-1 pl-5 text-subtle'>
            <li>
              Read the query in a leaf inside its own <Code>Suspense</Code>{' '}
              boundary. <Code>useSearchParams</Code> client-renders a
              prerendered page up to the nearest one.
            </li>
            <li>
              Push rather than replace, so the browser&apos;s Back undoes the
              change.
            </li>
            <li>
              Build the new query from <Code>window.location.search</Code>, so
              the page&apos;s own params survive the flag.
            </li>
          </ul>
          <CodePreview>{urlFlags}</CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            When to pass <Code>depth</Code>
          </h3>
          <p className='text-subtle'>
            Almost never. Roadie derives depth from render order, on the server
            too. Pass it only when panes render out of order, as in a resumed
            partial prerender under Next&apos;s <Code>cacheComponents</Code>, or
            sibling Suspense boundaries that hydrate out of order.
          </p>
        </div>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Loading and waiting</h2>
        <p className='text-subtle'>
          Return the pane straight away and await inside it. The column and the
          header paint within about 40ms of the click, a skeleton stands in for
          the body, and the frame shows that it is waiting.
        </p>
        <Guideline title='Await inside the pane'>
          <Guideline.Do code={awaitInside}>
            <p>
              Put the slow part in its own async component inside{' '}
              <Code>Pane.Body</Code>. The real header paints at once and the
              body shows the skeleton.
            </p>
          </Guideline.Do>
          <Guideline.Dont code={awaitAbove}>
            <p>
              Await in the page or layout before it returns the pane. Next holds
              the whole route, and nothing on screen changes until the data
              arrives.
            </p>
          </Guideline.Dont>
        </Guideline>
        <ul className='grid list-disc gap-1 pl-5 text-subtle'>
          <li>
            Awaiting <Code>params</Code> above the pane is fine. It resolves at
            once. The rule is about slow work.
          </li>
          <li>
            <Code>loading</Code> on the pane replaces the default skeleton with
            your own. <Code>loading</Code> on <Code>Pane.Body</Code> wins over
            it.
          </li>
          <li>
            A wait outside <Code>Pane.Body</Code> still paints the column, with
            a skeleton header in place of yours.
          </li>
          <li>
            <Code>loading.tsx</Code> is optional. Next partially prefetches a
            dynamic route only when it has one. Without it, a click waits for
            the server&apos;s first bytes before anything changes, and the
            frame&apos;s pending indicator covers that gap.
          </li>
          <li>
            <Code>pending</Code> holds the pending indicator for a wait Roadie
            can&apos;t see, such as a client fetch without Suspense or a
            mutation.
          </li>
        </ul>
        <p className='text-subtle'>
          Roadie marks a click on any Roadie link. For a navigation you start
          yourself, such as a <Code>router.push</Code>, report it with{' '}
          <Code>usePendingNavigation</Code>. The route landing calls{' '}
          <Code>stop</Code> for you, so call it only when the navigation never
          happens.
        </p>
        <CodePreview>{pendingCode}</CodePreview>
        <p className='text-subtle'>
          The hooks&apos; reference lives on{' '}
          <Link href='/components/navigator#hooks'>Navigator</Link>,{' '}
          <Link href='/components/pane'>Pane</Link> and{' '}
          <Link href='/foundations/linking'>Linking</Link>.
        </p>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Without a framework</h2>
        <p className='text-subtle'>
          Navigator never reads the URL, so any router works, including none.
          Every live example on this site is this shape.
        </p>
        <ul className='grid list-disc gap-1 pl-5 text-subtle'>
          <li>
            Keep the path in state. Pass it as <Code>value</Code> and update it
            from <Code>onValueChange</Code>. A destination with an{' '}
            <Code>href</Code> also goes through your link, so both set the same
            path, which is harmless.
          </li>
          <li>
            Give <Code>RoadieLinkProvider</Code> your own link, so list rows and
            Back update the same state.
          </li>
          <li>Render the panes the path implies, in order.</li>
        </ul>
        <CodePreview>{withoutFramework}</CodePreview>
        <div className='grid gap-2'>
          <h3
            id='an-empty-detail-column'
            className='text-display-ui-5 text-strong'
          >
            An empty detail column
          </h3>
          <p className='text-subtle'>
            A route renders only the panes it has reached. Client state can
            mount one early, such as a detail column that asks you to pick an
            event. Pass <Code>reached={'{false}'}</Code> on it. It fills its
            column where two fit, but it never becomes the top pane, so a phone
            shows the list.
          </p>
          <CodePreview language='tsx-live-noinline' expandable>
            {reachedExample}
          </CodePreview>
        </div>
      </section>

      <aside className='grid gap-2 rounded-xl emphasis-subtle p-4'>
        <p className='font-semibold text-strong'>Why not intercepting routes</p>
        <p className='text-subtle'>
          Parallel and intercepting routes can put a list and a detail under one
          URL too. Roadie recommends nested layouts instead.
        </p>
        <ol className='grid list-decimal gap-1 pl-5 text-subtle'>
          {interceptionReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ol>
        <p className='text-subtle'>
          The cost is the empty <Code>page.tsx</Code> at each level. If a real
          need for interception appears, it can come back.
        </p>
      </aside>
    </div>
  )
}
