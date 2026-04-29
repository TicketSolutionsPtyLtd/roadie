import Link from 'next/link'

import { CodePreview } from '@/components/CodePreview'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Linking',
  description:
    'A single href prop, automatic external-link safety, and one-line client routing through next/link via RoadieLinkProvider — across every link-bearing Roadie component.'
}

export default function LinkingPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Linking</h1>
        <p className='text-lg text-subtle'>
          Pass <Code>href</Code> and you&apos;re done. Roadie picks the right
          element, applies the right <Code>target</Code> / <Code>rel</Code>{' '}
          defaults, and routes through your app&apos;s configured client router
          via <Code>RoadieLinkProvider</Code>. Use <Code>onClick</Code> instead
          of <Code>href</Code> and you get a real <Code>&lt;button&gt;</Code>{' '}
          back. Everything that&apos;s link-shaped — Button, IconButton, Card,
          Breadcrumb.Link, Carousel.TitleLink, Tabs.Tab — speaks the same
          vocabulary.
        </p>
      </div>

      {/* Quick start */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Quick start</h2>
        <p className='text-subtle'>
          Mount <Code>RoadieLinkProvider</Code> once at your app root, alongside{' '}
          <Code>ThemeProvider</Code>. Pass <Code>next/link</Code> directly, or
          any wrapper that takes <Code>href</Code> + <Code>children</Code>.
        </p>
        <CodePreview>{`import NextLink from 'next/link'
import { RoadieLinkProvider, ThemeProvider } from '@oztix/roadie-components'

export function Providers({ children }) {
  return (
    <RoadieLinkProvider Link={NextLink}>
      <ThemeProvider>{children}</ThemeProvider>
    </RoadieLinkProvider>
  )
}`}</CodePreview>
        <p className='text-subtle'>
          Now every Roadie component that accepts <Code>href</Code> routes
          through Next&apos;s client navigation automatically — prefetch, scroll
          restoration, view transitions all preserved.
        </p>
      </section>

      {/* Decision tree */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>How href is resolved</h2>
        <p className='text-subtle'>
          The same rules apply to every link-bearing component. The decision is
          pure and SSR-safe — no hydration mismatches, no client-only checks.
        </p>
        <div className='overflow-x-auto'>
          <table className='w-full border-collapse text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>href shape</th>
                <th className='py-2 pr-4 font-semibold'>Renders as</th>
                <th className='py-2 font-semibold'>Defaults applied</th>
              </tr>
            </thead>
            <tbody className='[&_td]:py-2 [&_td]:pr-4'>
              <tr className='border-b border-subtle'>
                <td>
                  <Code>undefined</Code>
                </td>
                <td>
                  <Code>&lt;button&gt;</Code> (or <Code>&lt;div&gt;</Code> for
                  Card without onClick)
                </td>
                <td>—</td>
              </tr>
              <tr className='border-b border-subtle'>
                <td>
                  <Code>/events/123</Code>, <Code>./local</Code>,{' '}
                  <Code>#section</Code>
                </td>
                <td>
                  Configured <Code>Link</Code> (or <Code>&lt;a&gt;</Code> if no
                  provider)
                </td>
                <td>—</td>
              </tr>
              <tr className='border-b border-subtle'>
                <td>
                  <Code>https://…</Code>, <Code>http://…</Code>,{' '}
                  <Code>{'//…'}</Code>
                </td>
                <td>
                  <Code>&lt;a&gt;</Code>
                </td>
                <td>
                  <Code>target=&apos;_blank&apos;</Code>{' '}
                  <Code>rel=&apos;noopener noreferrer&apos;</Code>
                </td>
              </tr>
              <tr>
                <td>
                  <Code>mailto:</Code>, <Code>tel:</Code>, <Code>sms:</Code>
                </td>
                <td>
                  <Code>&lt;a&gt;</Code>
                </td>
                <td>
                  None — no <Code>target</Code>, no <Code>rel</Code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className='text-subtle'>
          Override per call with <Code>external</Code> (boolean),{' '}
          <Code>target</Code>, or <Code>rel</Code>. Pass{' '}
          <Code>external={`{false}`}</Code> on an{' '}
          <Code>https://oztix.com.au/x</Code> URL to force internal routing
          through the provider; pass <Code>external</Code> on an internal
          redirect path to open in a new tab.
        </p>
      </section>

      {/* Per-component reference */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Components</h2>
        <p className='text-subtle'>
          Every link-bearing component below accepts the same <Code>href</Code>{' '}
          / <Code>external</Code> / <Code>target</Code> / <Code>rel</Code>{' '}
          props. The escape hatch column shows the API for cases where{' '}
          <Code>href</Code> isn&apos;t enough (custom elements, full render
          control).
        </p>
        <div className='overflow-x-auto'>
          <table className='w-full border-collapse text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Component</th>
                <th className='py-2 pr-4 font-semibold'>Default element</th>
                <th className='py-2 font-semibold'>Escape hatch</th>
              </tr>
            </thead>
            <tbody className='[&_td]:py-2 [&_td]:pr-4'>
              <tr className='border-b border-subtle'>
                <td>
                  <Code>Button</Code>, <Code>IconButton</Code>
                </td>
                <td>
                  <Code>&lt;button&gt;</Code>
                </td>
                <td>
                  <Code>render</Code> prop
                </td>
              </tr>
              <tr className='border-b border-subtle'>
                <td>
                  <Code>Card</Code>
                </td>
                <td>
                  <Code>&lt;div&gt;</Code> (or routed <Code>&lt;a&gt;</Code>{' '}
                  when href is set)
                </td>
                <td>
                  <Code>render</Code> prop
                </td>
              </tr>
              <tr className='border-b border-subtle'>
                <td>
                  <Code>Breadcrumb.Link</Code>
                </td>
                <td>
                  <Code>&lt;a&gt;</Code>
                </td>
                <td>
                  <Code>render</Code> prop
                </td>
              </tr>
              <tr className='border-b border-subtle'>
                <td>
                  <Code>Carousel.TitleLink</Code>
                </td>
                <td>
                  <Code>&lt;a&gt;</Code>
                </td>
                <td>
                  <Code>render</Code> prop
                </td>
              </tr>
              <tr>
                <td>
                  <Code>Tabs.Tab</Code>
                </td>
                <td>
                  <Code>&lt;button&gt;</Code> (or routed <Code>&lt;a&gt;</Code>{' '}
                  when href is set)
                </td>
                <td>
                  <Code>render</Code> prop
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Examples */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Examples</h2>

        <h3 className='text-display-ui-5 text-strong'>Internal navigation</h3>
        <CodePreview>{`<Button href='/events/123'>View event</Button>
<Card href='/events/123'>{/* whole-card link */}</Card>
<Breadcrumb.Link href='/events'>Events</Breadcrumb.Link>`}</CodePreview>

        <h3 className='text-display-ui-5 text-strong'>External link</h3>
        <CodePreview>{`<Button href='https://stripe.com/docs'>Stripe docs</Button>
// Renders <a target='_blank' rel='noopener noreferrer'>`}</CodePreview>

        <h3 className='text-display-ui-5 text-strong'>Email / phone</h3>
        <CodePreview>{`<Button href='mailto:hello@oztix.com.au'>Email us</Button>
<IconButton aria-label='Call' href='tel:+61400000000'>
  <PhoneIcon />
</IconButton>`}</CodePreview>

        <h3 className='text-display-ui-5 text-strong'>
          Force external / internal
        </h3>
        <CodePreview>{`{/* First-party URL that should still open in a new tab: */}
<Button href='https://oztix.com.au/checkout' external>
  Checkout
</Button>

{/* Internal-looking redirect that bounces through the SPA: */}
<Button href='/redirect/foo' external={false}>
  Continue
</Button>`}</CodePreview>
      </section>

      {/* Escape hatches */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Escape hatch — render</h2>
        <p className='text-subtle'>
          The <Code>href</Code> path covers the happy case. For full control
          over the rendered element, every Roadie component accepts the same{' '}
          <Code>render</Code> prop — element form, component form, or function
          form. The contract mirrors{' '}
          <Link
            href='https://base-ui.com/react/overview/composition'
            className='text-accent-11 underline'
          >
            Base UI&apos;s render prop
          </Link>
          .
        </p>

        <h3 className='text-display-ui-5 text-strong'>Element form</h3>
        <CodePreview>{`{/* Card as a clickable button (no href, full element swap): */}
<Card render={<button type='button' onClick={handleSelect} />}>
  …
</Card>

{/* Button: typed access to anchor-only DOM props */}
<Button render={<a href='/file.pdf' download='spec.pdf' />}>
  Download spec
</Button>

{/* Breadcrumb.Link with a custom analytics-aware wrapper: */}
<Breadcrumb.Link render={<MyTrackedLink analyticsId='breadcrumb' href='/x' />}>
  Events
</Breadcrumb.Link>`}</CodePreview>

        <h3 className='text-display-ui-5 text-strong'>Function form</h3>
        <p className='text-subtle'>
          Receive the default props and return any element. Useful for
          state-aware rendering or attribute composition.
        </p>
        <CodePreview>{`<Tabs.Tab
  value='events'
  render={(props, state) => (
    <a {...props} data-active={state.selected} href='/events' />
  )}
>
  Events
</Tabs.Tab>`}</CodePreview>

        <p className='text-subtle'>
          When you pass both <Code>href</Code> and <Code>render</Code>,{' '}
          <Code>render</Code> wins — Roadie&apos;s smart routing is silently
          disabled for that call. Button logs a one-shot dev warning so the
          conflict can&apos;t ship by accident. Pick one.
        </p>

        <p className='text-subtle'>
          <strong>
            Legacy <Code>as</Code> prop:
          </strong>{' '}
          <Code>Card</Code>, <Code>Breadcrumb.Link</Code>, and{' '}
          <Code>Carousel.TitleLink</Code> previously exposed an <Code>as</Code>{' '}
          prop for polymorphism. It continues to work for back-compat but is{' '}
          <Code>@deprecated</Code> as of v2.6 and will be removed in v3.0.0 —
          migrate to <Code>render</Code>.
        </p>
      </section>

      {/* Tabs gotcha */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Link tabs — <Code>Tabs.Tab href</Code>
        </h2>
        <p className='text-subtle'>
          Tabs work as link-tabs out of the box — pass <Code>href</Code> on each{' '}
          <Code>Tabs.Tab</Code> and the rendered anchor participates in the tab
          list&apos;s roving tabindex group. Arrow keys still move focus across
          mixed button + anchor tabs.
        </p>
        <CodePreview>{`<Tabs value={value} onValueChange={setValue}>
  <Tabs.List>
    <Tabs.Tab value='overview' href='/account/overview'>Overview</Tabs.Tab>
    <Tabs.Tab value='events'   href='/account/events'>Events</Tabs.Tab>
    <Tabs.Tab value='settings' href='/account/settings'>Settings</Tabs.Tab>
  </Tabs.List>
</Tabs>`}</CodePreview>
        <p className='text-subtle'>
          <strong>Gotcha:</strong> pressing Enter on a focused link-tab triggers
          native browser navigation immediately. If you derive{' '}
          <Code>Tabs.value</Code> from controlled local state, you can see a
          brief flicker between selection and route change. Recommended pattern:
          derive <Code>value</Code> from the route itself (e.g. via{' '}
          <Code>usePathname()</Code>) so route is the source of truth.
        </p>
      </section>

      {/* Tracking */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Tracking actions</h2>
        <p className='text-subtle'>
          Roadie ships zero analytics code — tracking taxonomy is product-shaped
          (event names, page sections, vendor choices). The recommended pattern
          is a small consumer-app wrapper that reads{' '}
          <Code>currentTarget.href</Code> / <Code>aria-label</Code> off the
          rendered element, so a single <Code>&lt;Tracked&gt;</Code> works on
          top of every Roadie action.
        </p>
        <CodePreview>{`// app-level component, lives in your app — not in Roadie
'use client'
import { useTracking } from '@/utils/tracking'

export function Tracked({ trackEvent = 'link', pageSection, children }) {
  const { trackClick } = useTracking()
  return React.cloneElement(children, {
    onClick: (e) => {
      const el = e.currentTarget
      trackClick(trackEvent, {
        pageSection,
        href: el.getAttribute('href') ?? undefined,
        label: el.getAttribute('aria-label') ?? el.textContent?.trim()
      })
      children.props.onClick?.(e)
    }
  })
}`}</CodePreview>
        <CodePreview>{`{/* Wrap any Roadie action — no tracking knowledge inside Roadie. */}
<Tracked pageSection='cart-checkout'>
  <Button href={checkoutUrl} intent='accent' emphasis='strong'>
    Checkout
  </Button>
</Tracked>`}</CodePreview>
      </section>

      {/* Migration */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Migration</h2>
        <p className='text-subtle'>
          <Code>LinkButton</Code> and <Code>LinkIconButton</Code> remain
          exported and continue to work, but new code should prefer{' '}
          <Code>Button</Code> / <Code>IconButton</Code> with <Code>href</Code>.
          They are scheduled for removal in v3.0.0.
        </p>
        <CodePreview>{`// Before
<LinkButton href='/events' intent='accent'>Events</LinkButton>
<LinkIconButton href='/cart' aria-label='Cart' size='icon-md'>
  <CartIcon />
</LinkIconButton>

// After
<Button href='/events' intent='accent'>Events</Button>
<IconButton href='/cart' aria-label='Cart' size='md'>
  <CartIcon />
</IconButton>`}</CodePreview>
      </section>
    </div>
  )
}
