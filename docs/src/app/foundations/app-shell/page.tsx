import type { ReactNode } from 'react'

import Link from 'next/link'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'App shell',
  description:
    'The Next.js parallel-routes and intercepting-routes recipe that puts a list and a detail under one URL',
  category: 'Building apps'
}

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <div className='overflow-x-auto rounded-xl emphasis-sunken p-4'>
      <pre className='font-mono text-xs leading-relaxed text-normal'>
        {children}
      </pre>
    </div>
  )
}

const fileTree = `app/
└─ (shell)/
   ├─ layout.tsx              # 'use client' — RoadieLinkProvider + Navigator
   ├─ default.tsx             # children-slot fallback
   ├─ items/
   │  ├─ page.tsx             # the list pane
   │  └─ [id]/
   │     └─ page.tsx          # standalone detail, for a hard navigation
   └─ @detail/                # parallel-route slot for the detail pane
      ├─ default.tsx          # null when nothing is intercepted
      ├─ [...catchAll]/
      │  └─ page.tsx          # null catch-all, clears a stale pane
      └─ (.)items/[id]/
         └─ page.tsx          # the side pane on a soft navigation`

const slots = [
  {
    slot: 'children',
    renders: 'The list route, and the standalone detail on a reload',
    fires: 'Every navigation'
  },
  {
    slot: '@detail',
    renders: 'The intercepted detail, beside the list',
    fires: 'A soft navigation that matches (.)items/[id]'
  },
  {
    slot: '@detail/default.tsx',
    renders: 'null',
    fires: 'A hard navigation the slot cannot match'
  },
  {
    slot: '@detail/[...catchAll]',
    renders: 'null',
    fires: 'Any path the interception does not match'
  }
]

const matchers = [
  {
    matcher: '(.)items',
    intercepts:
      'items at the same segment level, because the slot is not a segment'
  },
  {
    matcher: '(..)items',
    intercepts: 'items one real segment up, which is the common mis-reach'
  }
]

const constraints = [
  {
    constraint: 'A default.tsx in every slot',
    breaks: 'A hard navigation to a URL the slot cannot match 404s'
  },
  {
    constraint: 'A null catch-all in the slot',
    breaks: 'The last intercepted detail stays mounted after you navigate away'
  },
  {
    constraint: 'A standalone route beside every intercepted one',
    breaks: 'A reload or a shared link 404s, because interception is soft-only'
  },
  {
    constraint: 'A client component shell with RoadieLinkProvider',
    breaks:
      'Navigation items disappear, or hrefs hard-navigate instead of intercepting'
  }
]

const outcomes = [
  {
    navigation: 'Click a list item',
    result:
      'The URL becomes /items/:id and the detail renders in @detail beside the list'
  },
  {
    navigation: 'Reload that URL',
    result: 'The standalone items/[id] route serves the detail on its own'
  },
  { navigation: 'Navigate away', result: 'The null catch-all clears the pane' },
  {
    navigation: 'Narrow the window',
    result: 'The panes become a stack, and the detail covers the list'
  }
]

export default function AppShellPage() {
  return (
    <div className='grid gap-12'>
      <p className='text-lg text-subtle'>
        The Next.js routing recipe that puts a list and a detail under one URL,
        side by side on desktop and standalone on reload.
      </p>

      <div className='grid gap-2 rounded-xl emphasis-subtle border border-subtle p-4 intent-warning'>
        <p className='font-semibold text-strong'>
          This recipe needs a server-rendered app
        </p>
        <p className='text-subtle'>
          Next.js hard-rejects intercepting routes under static export (
          <Code>output: &apos;export&apos;</Code>), as a build-time abort rather
          than a warning. These docs ship as a static export, so there is no
          live example on this page. Use the recipe in an app that renders on a
          server, which is where Navigator is consumed in production.
        </p>
      </div>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>How it works</h2>
        <p className='text-subtle'>
          One route group holds the shell. <Code>layout.tsx</Code> mounts{' '}
          <Code>Navigator</Code> and renders both the <Code>children</Code> slot
          and the <Code>@detail</Code> parallel slot. <Code>@detail</Code>{' '}
          carries the interception.
        </p>
        <CodeBlock>{fileTree}</CodeBlock>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Slot</th>
                <th className='py-2 pr-4 font-semibold'>Renders</th>
                <th className='py-2 font-semibold'>Fires on</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler'>
              {slots.map(({ slot, renders, fires }) => (
                <tr key={slot}>
                  <td className='py-2 pr-4 font-mono text-xs text-strong'>
                    {slot}
                  </td>
                  <td className='py-2 pr-4 text-subtle'>{renders}</td>
                  <td className='py-2 text-subtle'>{fires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className='text-subtle'>
          Both slots are server-rendered. Wrap each in its own fragment when you
          pass them to <Code>Navigator.Content</Code>, not an array. An
          unresolved RSC placeholder in an array trips Next 16&apos;s spurious
          &quot;unique key&quot; warning.
        </p>
        <CodeBlock>{`<Navigator.Content>
  <>{children}</>
  <>{detail}</>
</Navigator.Content>`}</CodeBlock>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>The panes</h2>
        <p className='text-subtle'>
          Each route renders one <Link href='/components/pane'>Pane</Link>. The
          list route is the root of the drill-down, and the intercepted detail
          is the pane on top of it.
        </p>
        <CodeBlock>{`// app/(shell)/items/page.tsx
<Pane role='list'>…</Pane>

// app/(shell)/@detail/(.)items/[id]/page.tsx
<Pane role='detail' current>…</Pane>`}</CodeBlock>
        <p className='text-subtle'>
          A pane registers with the nearest <Code>Navigator.Content</Code>{' '}
          wherever it sits, so panes rendered by two different slots join one
          stack. <Code>role</Code> sets the depth, and the deepest{' '}
          <Code>current</Code> pane is the top.{' '}
          <Link href='/components/pane'>Pane</Link> owns the columns, the
          stacking, and whether the header draws Back or Close. Nothing here
          changes that.
        </p>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          The <Code>(.)</Code> matcher
        </h2>
        <p className='text-subtle'>
          Interception matchers count path segments, and a <Code>@slot</Code>{' '}
          folder is not a segment. So <Code>(.)items</Code> inside{' '}
          <Code>@detail/</Code> matches <Code>items</Code> at the level of{' '}
          <Code>@detail</Code>&apos;s parent, which is where the list lives.
        </p>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Matcher</th>
                <th className='py-2 font-semibold'>Intercepts</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler'>
              {matchers.map(({ matcher, intercepts }) => (
                <tr key={matcher}>
                  <td className='py-2 pr-4 font-mono text-xs text-strong'>
                    {matcher}
                  </td>
                  <td className='py-2 text-subtle'>{intercepts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Constraints</h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Constraint</th>
                <th className='py-2 font-semibold'>Without it</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler'>
              {constraints.map(({ constraint, breaks }) => (
                <tr key={constraint}>
                  <td className='py-2 pr-4 text-strong'>{constraint}</td>
                  <td className='py-2 text-subtle'>{breaks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>The slot defaults</h3>
          <p className='text-subtle'>
            Give both the <Code>children</Code> slot and <Code>@detail</Code> a{' '}
            <Code>default.tsx</Code>. The <Code>@detail</Code> one renders{' '}
            <Code>null</Code>, so no detail means no pane.
          </p>
          <CodeBlock>{`// app/(shell)/@detail/default.tsx
export default function Default() {
  return null
}`}</CodeBlock>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>The null catch-all</h3>
          <p className='text-subtle'>
            Once a detail is intercepted, Next keeps it mounted in the slot. A
            catch-all that renders <Code>null</Code> matches every
            non-intercepted path and clears the pane. Disable it with a
            bracket-free rename if you want to see the stale pane for yourself.
            Renaming it <Code>[...catchAllDisabled]</Code> still matches every
            path, and reports a false negative.
          </p>
          <CodeBlock>{`// app/(shell)/@detail/[...catchAll]/page.tsx
export default function CatchAll() {
  return null
}`}</CodeBlock>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>The standalone twin</h3>
          <p className='text-subtle'>
            The intercepted <Code>(.)items/[id]</Code> route only fires on a
            soft navigation. A reload or a shared link is a hard navigation, and
            resolves to the plain <Code>items/[id]/page.tsx</Code>, which
            renders the detail on its own. Every level that can be intercepted
            needs its twin.
          </p>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            The client shell and link provider
          </h3>
          <p className='text-subtle'>
            Author the whole Navigator tree in a client component, wrapped in{' '}
            <Link href='/foundations/linking'>RoadieLinkProvider</Link>. It
            gives every internal <Code>href</Code> to Next&apos;s Link, so a
            list-item tap stays a soft navigation and the <Code>@detail</Code>{' '}
            interception can render beside it. Without it, Navigator falls back
            to a plain anchor and reloads the standalone route instead.
          </p>
          <CodeBlock>{`// app/(shell)/layout.tsx
'use client'

import type { ReactNode } from 'react'

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

import { RoadieLinkProvider } from '@oztix/roadie-components'
import { Navigator } from '@oztix/roadie-components/navigator'

type ShellLayoutProps = {
  children: ReactNode
  detail: ReactNode
}

export default function ShellLayout({
  children,
  detail
}: ShellLayoutProps) {
  const pathname = usePathname()

  return (
    <RoadieLinkProvider Link={NextLink}>
      <Navigator value={pathname}>
        <Navigator.Primary aria-label='Main'>
          {/* Navigator.Item destinations */}
        </Navigator.Primary>
        <Navigator.Content>
          <>{children}</>
          <>{detail}</>
        </Navigator.Content>
      </Navigator>
    </RoadieLinkProvider>
  )
}`}</CodeBlock>
          <p className='text-subtle'>
            The provider also gives the Navigator frame slow-navigation
            feedback. It appears only after the short arm delay, disappears when
            the route lands, and never starts for a browser-handled download.
            Set <Code>pendingIndicator={'{false}'}</Code> when an app supplies
            its own navigation feedback.
          </p>
          <p className='text-subtle'>
            <Code>Navigator.Primary</Code> must be a direct child of{' '}
            <Code>Navigator</Code>, and items must be direct children of{' '}
            <Code>Primary</Code>, a <Code>Group</Code> or a{' '}
            <Code>Secondary</Code>. Navigator finds those parts by element
            reference, and a server component replaces the references.{' '}
            <Code>Navigator.Content</Code> and <Code>Pane</Code> are server-safe
            on their own, which is what lets the slots stay server components.
          </p>
        </div>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>What each move does</h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Move</th>
                <th className='py-2 font-semibold'>Result</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler'>
              {outcomes.map(({ navigation, result }) => (
                <tr key={navigation}>
                  <td className='py-2 pr-4 text-strong'>{navigation}</td>
                  <td className='py-2 text-subtle'>{result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className='text-subtle'>
          Roadie never reads the URL. To put the section list or More in the
          query string as well, see{' '}
          <Link href='/components/navigator#keep-the-list-and-more-in-the-url'>
            keeping the list and More in the URL
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
