import Link from 'next/link'

import { Guideline } from '@/components/Guideline'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Performance',
  description:
    'Frontend performance principles for building fast, responsive Oztix applications.'
}

export default function PerformancePage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Performance</h1>
        <p className='text-lg text-subtle'>
          Speed is a feature. Performance is the foundation of user trust.
          Latency kills flow.
        </p>
      </div>

      {/* ── Measure reliably ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Measure reliably</h2>
        <p className='text-subtle'>
          You can&apos;t fix what you can&apos;t measure. Guesswork leads to
          optimisation of the wrong things.
        </p>

        <Guideline
          title='Test on real conditions'
          description='Development machines lie. A fast laptop on fibre hides the problems your users face.'
        >
          <Guideline.Do>
            Disable extensions. Use CPU and network throttling to simulate real
            devices. Profile in an incognito window.
          </Guideline.Do>
          <Guideline.Dont>
            Profile on a high-end machine with a fibre connection and assume
            it&apos;s fine.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── Core Web Vitals ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Core Web Vitals</h2>
        <p className='text-subtle'>
          Three metrics that define real-world user experience. Target green on
          all three.
        </p>

        <Guideline
          title='No layout shift (CLS)'
          description='Stability is quality. Things should not jump around as they load.'
        >
          <Guideline.Do
            code={`<!-- Set explicit dimensions on images -->
<img src="hero.jpg" width={800} height={400} alt="..." />

<!-- Reserve space for async content -->
<div style={{ minHeight: 200 }}>
  {content ?? <Skeleton />}
</div>`}
          >
            Set explicit dimensions on all images and media. Reserve space for
            content that loads asynchronously.
          </Guideline.Do>
          <Guideline.Dont>
            Let an image push text down the page when it finally loads. Inject
            content above the viewport without reserving space.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Fast first paint (LCP)'
          description='Prioritise the viewport. Bandwidth should be spent on what is seen immediately.'
        >
          <Guideline.Do
            code={`<!-- Preload above-the-fold images -->
<link rel="preload" href="/hero.jpg" as="image" />

<!-- Lazy-load everything else -->
<img src="footer.jpg" loading="lazy" alt="..." />`}
          >
            Preload above-the-fold images. Lazy-load everything below the fold.
          </Guideline.Do>
          <Guideline.Dont>
            Lazy-load the Largest Contentful Paint image, causing a visible
            delay on the most important element.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Responsive to input (INP)'
          description='The main thread is for UI. Heavy logic belongs elsewhere.'
        >
          <Guideline.Do>
            Move expensive calculations or data processing to Web Workers. Break
            long tasks into smaller chunks with <Code>requestIdleCallback</Code>{' '}
            or <Code>scheduler.yield()</Code>.
          </Guideline.Do>
          <Guideline.Dont>
            Freeze the UI while parsing a large JSON file or running an
            expensive sort on the main thread.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── Rendering ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Rendering</h2>
        <p className='text-subtle'>
          Reactivity has a cost. The DOM is slow. Minimise the work the browser
          has to do.
        </p>

        <Guideline
          title='Track re-renders'
          description='Unnecessary renders burn battery and block interaction.'
        >
          <Guideline.Do>
            Use React DevTools or React Scan to identify and minimise
            re-renders. Colocate state near where it&apos;s used.
          </Guideline.Do>
          <Guideline.Dont>
            Assume functional components are cheap enough to re-render
            constantly. A parent re-rendering cascades to every child.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Minimise layout work'
          description='Reading and writing layout properties triggers expensive reflows.'
        >
          <Guideline.Do>
            Batch DOM reads and writes. Animate with <Code>transform</Code> and{' '}
            <Code>opacity</Code> (compositor-only properties) instead of{' '}
            <Code>width</Code>, <Code>height</Code>, or <Code>top</Code>.
          </Guideline.Do>
          <Guideline.Dont>
            Read a width, set a width, then read it again in a loop (layout
            thrashing).
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Virtualise large lists'
          description="DOM nodes are heavy. Don't render what the user can't see."
        >
          <Guideline.Do
            code={`/* Use virtualisation or CSS containment */
<VirtualList items={items} />

/* Or use CSS containment for simpler cases */
.offscreen { content-visibility: auto; }`}
          >
            Use virtualisation (e.g., <Code>virtua</Code>) or{' '}
            <Code>content-visibility: auto</Code> for long lists and large
            tables.
          </Guideline.Do>
          <Guideline.Dont>
            Render 10,000 rows in a table just because the API returned them.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── Network ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Network</h2>
        <p className='text-subtle'>
          Latency kills flow. API interactions should feel instantaneous.
        </p>

        <Guideline
          title='Network budgets'
          description='Set expectations for how fast things should be.'
        >
          <Guideline.Do>
            Ensure POST/PATCH/DELETE requests complete in &lt;500ms. Use
            optimistic UI for fast, reversible actions so the interface moves at
            the speed of thought.
          </Guideline.Do>
          <Guideline.Dont>
            Block the UI for 2 seconds while waiting for a database write.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Preconnect to origins'
          description='Handshakes take time. Establish connections before you need the data.'
        >
          <Guideline.Do
            code={`<link rel="preconnect" href="https://cdn.oztix.com.au" />
<link rel="dns-prefetch" href="https://api.oztix.com.au" />`}
          >
            Use <Code>&lt;link rel=&quot;preconnect&quot;&gt;</Code> for
            critical CDNs or API domains.
          </Guideline.Do>
          <Guideline.Dont>
            Wait until JavaScript requests a font before opening the connection
            to the font server.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── Fonts ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Fonts</h2>
        <p className='text-subtle'>
          Typography should not block reading. Text must appear fast. See{' '}
          <Link
            href='/foundations/typography'
            className='underline underline-offset-2'
          >
            Typography
          </Link>{' '}
          for the full type system.
        </p>

        <Guideline
          title='Optimise font loading'
          description='Custom fonts are a luxury the user pays for with load time.'
        >
          <Guideline.Do>
            Preload critical fonts. Subset fonts to only include used characters
            (e.g., <Code>unicode-range</Code>). Use{' '}
            <Code>font-display: swap</Code> so text is visible immediately.
          </Guideline.Do>
          <Guideline.Dont>
            Load a 5MB font file containing every language in the world for an
            English site.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── What Roadie handles ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>What Roadie handles</h2>
        <p className='text-subtle'>
          The design system already takes care of several performance concerns.
          You get these for free.
        </p>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>Fluid typography</h3>
            <p className='text-sm text-subtle'>
              Sizes <Code>text-lg</Code> and above use <Code>clamp()</Code> for
              fluid scaling. No manual breakpoint overrides needed.
            </p>
          </div>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>
              CSS-only utilities
            </h3>
            <p className='text-sm text-subtle'>
              Intent, emphasis, and interaction utilities are pure CSS. No
              JavaScript runtime cost for styling.
            </p>
          </div>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>
              Tree-shakeable components
            </h3>
            <p className='text-sm text-subtle'>
              Components are built with <Code>tsup</Code> and code-splitting.
              Import only what you use.
            </p>
          </div>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>Reduced motion</h3>
            <p className='text-sm text-subtle'>
              A global <Code>prefers-reduced-motion</Code> reset neutralises all
              transitions and animations automatically.
            </p>
          </div>
        </div>
      </section>

      {/* ── Quick reference ── */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Quick reference</h2>
        <p className='text-sm text-subtle'>
          How performance rules map to existing foundation pages.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Rule</th>
                <th className='py-2 pr-4 font-semibold'>Foundation</th>
                <th className='py-2 font-semibold'>What it covers</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              <tr>
                <td className='py-2 pr-4 text-strong'>No CLS</td>
                <td className='py-2 pr-4'>
                  <Link
                    href='/foundations/layout'
                    className='underline underline-offset-2'
                  >
                    Layout
                  </Link>
                </td>
                <td className='py-2'>
                  Grid defaults, explicit sizing, gap over margin
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Font optimisation</td>
                <td className='py-2 pr-4'>
                  <Link
                    href='/foundations/typography'
                    className='underline underline-offset-2'
                  >
                    Typography
                  </Link>
                </td>
                <td className='py-2'>
                  Fluid scaling, font families, preloading
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Compositor animations</td>
                <td className='py-2 pr-4'>
                  <Link
                    href='/foundations/motion'
                    className='underline underline-offset-2'
                  >
                    Motion
                  </Link>
                </td>
                <td className='py-2'>
                  Transform and opacity transitions, motion tokens
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Reduced motion</td>
                <td className='py-2 pr-4'>
                  <Link
                    href='/foundations/motion'
                    className='underline underline-offset-2'
                  >
                    Motion
                  </Link>
                </td>
                <td className='py-2'>
                  Global <Code>prefers-reduced-motion</Code> reset
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Optimistic UI</td>
                <td className='py-2 pr-4'>
                  <Link
                    href='/foundations/interactions'
                    className='underline underline-offset-2'
                  >
                    Interactions
                  </Link>
                </td>
                <td className='py-2'>Loading states, feedback patterns</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
