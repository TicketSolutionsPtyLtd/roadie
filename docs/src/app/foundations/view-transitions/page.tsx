import Link from 'next/link'

import { CodePreview } from '@/components/CodePreview'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'View transitions',
  description:
    'Patterns for using the CSS View Transitions API with Roadie layouts — z-index layering, named groups, keyframes, and search-param navigation.'
}

export default function ViewTransitionsPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>View transitions</h1>
        <p className='text-lg text-subtle'>
          The CSS{' '}
          <a
            href='https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API'
            target='_blank'
            rel='noreferrer'
          >
            View Transitions API
          </a>{' '}
          lets you morph, slide, and fade content across navigation boundaries
          without touching a JavaScript animation library. Roadie components
          compose cleanly with it — but sticky headers, hero images, and
          search-param-only navigation each have gotchas worth documenting up
          front.
        </p>
      </div>

      {/* Concepts */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>How it works</h2>
        <p className='text-subtle'>
          When the browser sees a new document during a view transition, it
          captures a snapshot of the old DOM and a snapshot of the new DOM, then
          interpolates between them. Each snapshot lives inside a pseudo-element
          tree:
        </p>
        <ul className='grid list-disc gap-2 pl-5 text-subtle'>
          <li>
            <Code>::view-transition-group(name)</Code> — the box that contains
            the old + new snapshots for a named element.
          </li>
          <li>
            <Code>::view-transition-image-pair(name)</Code> — the cross-fade
            pair.
          </li>
          <li>
            <Code>::view-transition-old(name)</Code> and{' '}
            <Code>::view-transition-new(name)</Code> — the two snapshots that
            the browser animates between.
          </li>
        </ul>
        <p className='text-subtle'>
          Anything without an explicit <Code>view-transition-name</Code> lives
          under the implicit <Code>root</Code> group. The root group paints
          first, which is why sticky headers sometimes end up{' '}
          <em>underneath</em> a hero image during a transition — the hero gets
          its own group, and the root group has no <Code>z-index</Code>.
        </p>
      </section>

      {/* Z-index layering */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Layering sticky headers above content
        </h2>
        <p className='text-subtle'>
          Give the sticky header its own named group and set a{' '}
          <Code>z-index</Code> on its <Code>::view-transition-group</Code>.
          Without this, content sliding in from below the fold will visually
          pass through or over the header mid-transition.
        </p>
        <CodePreview language='css'>
          {`/* 1. Name the header's group */
header[data-sticky] {
  view-transition-name: site-header;
}

/* 2. Float it above everything else during a transition */
::view-transition-group(site-header) {
  z-index: 100;
}`}
        </CodePreview>
        <p className='text-sm text-subtle'>
          Pick any integer above the default 0 — 100 is more than enough for
          most apps. Do the same for floating buttons, bottom sheets, and any
          other UI that should stay fixed while the page underneath animates.
        </p>
      </section>

      {/* Named groups */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Naming elements</h2>
        <p className='text-subtle'>
          When you name an element with <Code>view-transition-name</Code>, it
          gets its own animation group and morphs from its old position + size
          to its new position + size. Unnamed elements cross-fade together under
          the root group.
        </p>
        <p className='text-subtle'>
          Rule of thumb: <strong>when in doubt, name it</strong>. Unused names
          are free — they don&apos;t run an animation unless the element
          actually moves. Naming the hero image, the title, and the header
          separately is much cheaper than debugging a root-group cross-fade that
          clobbers half your UI.
        </p>
        <div className='grid gap-3 rounded-lg bg-sunken p-4'>
          <p className='text-sm text-strong'>Common named groups</p>
          <ul className='grid gap-1 text-sm text-subtle'>
            <li>
              <Code>site-header</Code> — sticky top nav
            </li>
            <li>
              <Code>collection-hero</Code> — above-the-fold hero image
            </li>
            <li>
              <Code>collection-title</Code> — the title that persists across
              routes
            </li>
            <li>
              <Code>collection-header</Code> — the elevated surface that wraps
              the hero on per-collection routes
            </li>
          </ul>
        </div>
      </section>

      {/* Keyframes */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Recommended keyframes</h2>
        <p className='text-subtle'>
          Default view transitions cross-fade for 250ms. Override with a named{' '}
          <Code>@keyframes</Code> rule and attach it to either the old or new
          snapshot.
        </p>
        <CodePreview language='css'>
          {`/* Slide the outgoing page up and fade it out */
::view-transition-old(root) {
  animation: roadie-slide-up 200ms ease-in both;
}

/* Fade the incoming page in */
::view-transition-new(root) {
  animation: roadie-fade-in 300ms ease-out both;
}

@keyframes roadie-slide-up {
  to { opacity: 0; transform: translateY(-16px); }
}
@keyframes roadie-fade-in {
  from { opacity: 0; }
}`}
        </CodePreview>
        <p className='text-sm text-subtle'>
          Keep durations short — under 400ms for navigation-level transitions.
          Respect <Link href='/foundations/motion'>motion tokens</Link> and{' '}
          <Code>prefers-reduced-motion</Code>: wrap your{' '}
          <Code>::view-transition-*</Code> rules in{' '}
          <Code>@media (prefers-reduced-motion: no-preference)</Code> so
          motion-sensitive users get an instant swap.
        </p>
      </section>

      {/* Search param transitions */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Triggering on search-param-only navigation
        </h2>
        <p className='text-subtle'>
          Next.js App Router doesn&apos;t trigger a hard navigation when only a
          search parameter changes, so browser-native view transitions
          don&apos;t fire automatically. Wrap the update in{' '}
          <Code>document.startViewTransition</Code> inside your navigation
          handler:
        </p>
        <CodePreview language='tsx'>
          {`'use client'

import { useRouter } from 'next/navigation'
import { startTransition } from 'react'

function FilterButton({ href }: { href: string }) {
  const router = useRouter()

  function handleClick() {
    // Feature-detect — not all browsers implement view transitions yet
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => {
        startTransition(() => router.push(href))
      })
    } else {
      router.push(href)
    }
  }

  return <button onClick={handleClick}>Filter</button>
}`}
        </CodePreview>
        <p className='text-sm text-subtle'>
          The <Code>startTransition</Code> wrapper keeps React from thrashing
          state updates during the browser&apos;s snapshot capture. Without it
          you can get flickers when the new page renders faster than the old
          page&apos;s snapshot.
        </p>
      </section>

      {/* Guidelines */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Guidelines</h2>
        <ul className='grid list-disc gap-2 pl-5 text-subtle'>
          <li>
            <p>
              <strong>Always feature-detect.</strong>{' '}
              <Code>document.startViewTransition</Code> is still gaining
              adoption — wrap every call in a <Code>typeof</Code> check and fall
              back to the standard navigation.
            </p>
          </li>
          <li>
            <p>
              <strong>Reserve view transitions for spatial continuity.</strong>{' '}
              Use them when the user would benefit from seeing an element move
              (hero → detail page, list → filtered list). Skip them for
              navigation that isn&apos;t spatially related.
            </p>
          </li>
          <li>
            <p>
              <strong>Stay under 400ms.</strong> Longer transitions feel
              sluggish, especially on search-param navigation where the user
              expects instant filter feedback.
            </p>
          </li>
          <li>
            <p>
              <strong>Test on mobile Safari.</strong> iOS has stricter rules
              about when <Code>startViewTransition</Code> can run — if you
              trigger it from an async callback, the captured snapshot may be
              stale.
            </p>
          </li>
          <li>
            <p>
              <strong>Don&apos;t animate intent.</strong> Changing{' '}
              <Code>--accent-hue</Code> or <Code>--accent-chroma</Code> during a
              transition produces noticeably ugly interpolation — set the new
              accent <em>before</em> the transition starts, or <em>after</em> it
              completes.
            </p>
          </li>
        </ul>
      </section>
    </div>
  )
}
