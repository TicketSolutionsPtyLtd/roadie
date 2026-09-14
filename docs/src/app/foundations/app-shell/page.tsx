import type { ReactNode } from 'react'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'App shell',
  description:
    'The Next.js parallel-routes + intercepting-routes recipe that turns Navigator into a real, URL-addressable app shell: list and detail in one URL on desktop, standalone detail on reload.'
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
   ├─ layout.tsx              # 'use client' — <Navigator> renders {children}
   │                          #   and the @detail slot side by side
   ├─ default.tsx             # children-slot fallback — required
   ├─ items/
   │  ├─ page.tsx             # the list pane
   │  └─ [id]/
   │     └─ page.tsx          # standalone detail (direct hit / reload)
   └─ @detail/                # parallel-route slot for the detail pane
      ├─ default.tsx          # renders null when nothing is intercepted
      ├─ [...catchAll]/
      │  └─ page.tsx          # null catch-all — clears a stale pane
      └─ (.)items/[id]/
         └─ page.tsx          # intercepted detail — the side pane on soft nav`

export default function AppShellPage() {
  return (
    <div className='grid gap-12'>
      <p className='text-lg text-subtle'>
        <Code>Navigator</Code> is a layout primitive — it renders the primary
        navigation and panes, but it does not own the URL. To get a real app
        shell, where a list and a detail sit side by side under one URL on
        desktop yet a reload deep-links straight to the detail, you pair
        Navigator with Next.js <strong>parallel routes</strong> and{' '}
        <strong>intercepting routes</strong>. This page documents the recipe
        that was verified for Navigator, and the one hard constraint that keeps
        it off this docs site.
      </p>

      {/* Blocking constraint — stated first, on purpose */}
      <section className='grid gap-4'>
        <div className='grid gap-2 rounded-xl emphasis-subtle border border-subtle p-4 intent-warning'>
          <h2 className='text-display-ui-4 text-strong'>
            This recipe needs a server-rendered Next app
          </h2>
          <p className='text-subtle'>
            Next.js{' '}
            <strong>
              hard-rejects intercepting routes under static export
            </strong>{' '}
            (<Code>output: &apos;export&apos;</Code>) — it is a build-time
            abort, not a warning. This documentation site ships as a static
            export, so the recipe below <strong>cannot run here</strong> and
            there is no live example on this page. It was verified in a
            throwaway server-rendered sandbox instead. Use it in an app that
            renders on a Node/Vercel server — which is where Navigator is
            actually consumed in production.
          </p>
        </div>
      </section>

      {/* The folder tree */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>The folder tree</h2>
        <p className='text-subtle'>
          One route group holds the shell. <Code>layout.tsx</Code> mounts{' '}
          <Code>Navigator</Code> and renders both the <Code>children</Code> slot
          (the list) and the <Code>@detail</Code> parallel slot (the detail
          pane). The <Code>@detail</Code> slot carries the interception.
        </p>
        <CodeBlock>{fileTree}</CodeBlock>
        <p className='text-subtle'>
          The layout must be a client component — the whole Navigator tree is,
          because <Code>Navigator.Primary</Code>,{' '}
          <Code>Navigator.Secondary</Code>, <Code>Navigator.Group</Code>,{' '}
          <Code>Navigator.Menu</Code> and <Code>Navigator.ExpandToggle</Code>{' '}
          are found by element reference, and React Flight breaks that for
          server-authored trees.
        </p>
        <p className='text-subtle'>
          <Code>children</Code> and <Code>@detail</Code> are both
          server-rendered slots — wrap each in its own fragment when passing
          them to <Code>Navigator.Content</Code>, not an array. An unresolved
          RSC placeholder in an array trips Next 16&apos;s spurious &quot;unique
          key&quot; warning.
        </p>
        <CodeBlock>{`<Navigator.Content>
  <>{children}</>
  <>{detail}</>
</Navigator.Content>`}</CodeBlock>
      </section>

      {/* Matcher rule */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          The <Code>(.)</Code> vs <Code>(..)</Code> matcher
        </h2>
        <p className='text-subtle'>
          Interception matchers count <strong>path segments</strong>, and{' '}
          <strong>
            a <Code>@slot</Code> folder is not a segment
          </strong>
          . So <Code>(.)items</Code> sitting inside <Code>@detail/</Code>{' '}
          matches <Code>items</Code> at the level of <Code>@detail</Code>&apos;s
          parent — the same level the list lives at — not one level down. This
          is the part that trips people up: you reach for <Code>(..)</Code>{' '}
          expecting the slot to count as a hop, but it doesn&apos;t.
        </p>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Matcher</th>
                <th className='py-2 font-semibold'>Intercepts</th>
              </tr>
            </thead>
            <tbody className='[&_td]:py-2 [&_td]:pr-4'>
              <tr className='border-b border-subtle'>
                <td className='font-mono text-xs'>(.)items</td>
                <td className='text-subtle'>
                  <Code>items</Code> at the same segment level (the slot is
                  ignored)
                </td>
              </tr>
              <tr>
                <td className='font-mono text-xs'>(..)items</td>
                <td className='text-subtle'>
                  <Code>items</Code> one real segment up — wrong here, and a
                  common mis-reach
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Three constraints */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>
          Three constraints you cannot skip
        </h2>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            1. A <Code>default.tsx</Code> in every slot
          </h3>
          <p className='text-subtle'>
            A route with a parallel slot 404s on a hard navigation to any URL a
            slot can&apos;t match unless that slot has a{' '}
            <Code>default.tsx</Code>. Give both the <Code>children</Code> slot
            and <Code>@detail</Code> one. The <Code>@detail</Code> default
            renders <Code>null</Code> — no detail, no pane.
          </p>
          <CodeBlock>{`// app/(shell)/@detail/default.tsx
export default function Default() {
  return null
}`}</CodeBlock>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            2. A null catch-all in the slot
          </h3>
          <p className='text-subtle'>
            Once a detail is intercepted, the pane goes <strong>stale</strong> —
            navigate away and Next keeps the last intercepted content mounted in
            the slot. A catch-all that renders <Code>null</Code> matches every
            non-intercepted path and clears the pane.
          </p>
          <CodeBlock>{`// app/(shell)/@detail/[...catchAll]/page.tsx
export default function CatchAll() {
  return null
}`}</CodeBlock>
          <div className='grid gap-2 rounded-xl emphasis-subtle border border-subtle p-4'>
            <p className='text-sm font-semibold text-strong'>
              Verification caveat
            </p>
            <p className='text-sm text-subtle'>
              To prove the catch-all is load-bearing you must genuinely disable
              it. Renaming it to <Code>[...catchAllDisabled]</Code>{' '}
              <strong>does not</strong> — the brackets and ellipsis are what
              make a folder match every path; the identifier inside only names
              the params key, so it is still a live catch-all and the pane still
              clears (a false negative). A <strong>bracket-free</strong> rename
              such as <Code>_catchAll</Code> is what actually removes the route
              and reproduces the stale pane.
            </p>
          </div>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            3. One URL-addressable deep pane per level
          </h3>
          <p className='text-subtle'>
            The intercepted <Code>(.)items/[id]</Code> route only fires on a{' '}
            <strong>soft</strong> (client-side) navigation — a click from the
            list. A reload or a shared deep link is a hard navigation and must
            resolve to a real, standalone route. That is what the plain{' '}
            <Code>items/[id]/page.tsx</Code> is for: it renders the detail on
            its own, with no list pane. Every level that can be intercepted
            needs its standalone twin.
          </p>
        </div>
      </section>

      {/* Behaviour summary */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>What you get</h2>
        <ul className='grid list-disc gap-2 pl-5'>
          <li>
            <p>
              <strong>Click a list item</strong> → the URL becomes{' '}
              <Code>/items/:id</Code> via an RSC fetch, and the detail renders
              in the <Code>@detail</Code> pane beside the still-visible list.
              One URL, both panes, no duplication.
            </p>
          </li>
          <li>
            <p>
              <strong>Reload that URL</strong> → the standalone{' '}
              <Code>items/[id]</Code> route serves the detail on its own.
            </p>
          </li>
          <li>
            <p>
              <strong>Navigate away</strong> → the null catch-all clears the
              detail pane.
            </p>
          </li>
          <li>
            <p>
              <strong>On mobile</strong>, Navigator stacks the panes: a
              section&apos;s list pane sits at the root of the stack, and its
              sub-pages push over it. The single-pane push presentation is owned
              by Navigator&apos;s own layout, not by the routing recipe.
            </p>
          </li>
        </ul>
      </section>
    </div>
  )
}
