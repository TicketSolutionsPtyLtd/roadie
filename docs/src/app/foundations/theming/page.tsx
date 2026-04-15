import Link from 'next/link'

import { CodePreview } from '@/components/CodePreview'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Theming',
  description:
    'ThemeProvider, dynamic accent colour, dark mode, and pre-hydration bootstrap — everything you need to theme a Roadie app at runtime or at build time.'
}

export default function ThemingPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Theming</h1>
        <p className='text-lg text-subtle'>
          Roadie&apos;s <Code>ThemeProvider</Code> wires one hex accent colour
          into 14-step OKLCH scales at runtime and handles dark mode at the same
          time. Use it uncontrolled for apps with a single brand colour,
          controlled for apps themed from data, or compose the pre-hydration
          bootstrap helpers for static exports that need zero-flash cold loads.
        </p>
      </div>

      {/* Concepts */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Concepts</h2>
        <ul className='grid list-disc gap-2 pl-5 text-subtle'>
          <li>
            <p>
              <strong>Accent colour.</strong> A single hex string drives two CSS
              custom properties — <Code>--accent-hue</Code> and{' '}
              <Code>--accent-chroma</Code> — which Roadie&apos;s CSS tokens feed
              into <Code>oklch()</Code> curves. Changing the accent updates
              every component that reads the <Code>accent-*</Code> scale through
              the cascade; there are no component-level theme props.
            </p>
          </li>
          <li>
            <p>
              <strong>Dark mode.</strong> The <Code>.dark</Code> class on{' '}
              <Code>&lt;html&gt;</Code> swaps a second set of OKLCH values.{' '}
              <Code>ThemeProvider</Code> handles the toggle, localStorage
              persistence, and optional <Code>prefers-color-scheme</Code>{' '}
              following. Dark mode and accent colour are independent — setting
              one never resets the other.
            </p>
          </li>
          <li>
            <p>
              <strong>Intent cascade.</strong> Intent (neutral, brand, accent,
              danger, etc.) is set via <Code>intent-*</Code> utility classes and
              flows down through CSS custom properties. Child components inherit
              automatically — no context providers per intent.
            </p>
          </li>
          <li>
            <p>
              <strong>OKLCH curves.</strong> All 14 steps per intent are
              computed from a single hue + chroma using hand-tuned lightness /
              chroma curves. The math happens at CSS resolve time, not in
              JavaScript, so the scale stays perfectly consistent across
              reflows.
            </p>
          </li>
        </ul>
      </section>

      {/* Uncontrolled */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Static theming (uncontrolled)
        </h2>
        <p className='text-subtle'>
          For apps with a single brand colour that never changes at runtime,
          wrap the root layout in <Code>ThemeProvider</Code> and pass{' '}
          <Code>defaultAccentColor</Code>. Children can still call{' '}
          <Code>useTheme().setAccentColor(hex)</Code> imperatively — e.g. an
          in-app colour picker — and the internal state tracks the change.
        </p>
        <CodePreview language='tsx'>
          {`// app/layout.tsx
import { ThemeProvider } from '@oztix/roadie-components'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider defaultAccentColor="#7C3AED" followSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}`}
        </CodePreview>
      </section>

      {/* Controlled */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Dynamic theming (controlled)
        </h2>
        <p className='text-subtle'>
          When the accent colour comes from async data — a CMS field, a feature
          flag, per-tenant config — pass it as the <Code>accentColor</Code>{' '}
          prop. The provider becomes controlled: the prop wins on every render,
          and imperative <Code>setAccentColor</Code> calls become no-ops with a
          dev warning. Pass <Code>null</Code> to opt into controlled mode while
          falling back to <Code>defaultAccentColor</Code>.
        </p>
        <CodePreview language='tsx'>
          {`// app/collections/[slug]/page.tsx
'use client'

import { useCollection } from '@/hooks/useCollection'
import { ThemeProvider } from '@oztix/roadie-components'

export default function CollectionPage({ params }) {
  const { data } = useCollection(params.slug)

  return (
    <ThemeProvider accentColor={data?.themeColour ?? null}>
      <CollectionView collection={data} />
    </ThemeProvider>
  )
}`}
        </CodePreview>
        <p className='text-sm text-subtle'>
          The provider re-renders whenever the prop changes — no{' '}
          <Code>useEffect</Code>, no manual cleanup, no reset logic. Passing{' '}
          <Code>null</Code> while the query is loading falls back to{' '}
          <Code>defaultAccentColor</Code>, so the theme never renders in a
          broken state during the suspense boundary. The old{' '}
          <Code>CollectionAccentSync</Code>-style effect helper is unnecessary —
          consumer apps can delete their bespoke effect-plus-cleanup wiring as
          soon as they adopt the controlled prop.
        </p>
      </section>

      {/* Validation */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Validation &amp; error handling
        </h2>
        <p className='text-subtle'>Roadie validates hex input at two points:</p>
        <ul className='grid list-disc gap-2 pl-5 text-subtle'>
          <li>
            <p>
              <strong>
                <Code>setAccentColor(hex)</Code> throws synchronously
              </strong>{' '}
              with an <Code>InvalidColorError</Code> when the argument
              isn&apos;t a valid hex colour. Wrap the call in a try/catch or
              validate upfront with <Code>isValidHexColor</Code>.
            </p>
          </li>
          <li>
            <p>
              <strong>Invalid controlled props log and fall back.</strong> When{' '}
              <Code>accentColor</Code> is a non-hex string, the provider logs a
              dev warning and renders with <Code>defaultAccentColor</Code> so
              the app never shows a broken theme.
            </p>
          </li>
        </ul>
        <CodePreview language='tsx'>
          {`import {
  DEFAULT_ACCENT_COLOR,
  InvalidColorError,
  ThemeProvider,
  isValidHexColor
} from '@oztix/roadie-components'

function CollectionTheme({ collection, children }) {
  // Guard untrusted input at the fetch boundary
  const accent = isValidHexColor(collection.themeColour)
    ? collection.themeColour
    : DEFAULT_ACCENT_COLOR

  return <ThemeProvider accentColor={accent}>{children}</ThemeProvider>
}

// Imperative calls throw synchronously on invalid input
try {
  setAccentColor(userInput)
} catch (error) {
  if (error instanceof InvalidColorError) {
    toast.error('That colour isn\\'t a valid hex value.')
  }
}`}
        </CodePreview>
      </section>

      {/* Pre-hydration bootstrap */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Pre-hydration bootstrap
        </h2>
        <p className='text-subtle'>
          React hydration runs after the first paint, so an app that only sets
          the accent inside <Code>ThemeProvider</Code> will flash the default
          blue for ~200–400ms on cold loads. For apps that know the accent
          colour on the server — per-tenant branding, promoter-branded pages,
          SSG routes — use the synchronous bootstrap helpers to inject{' '}
          <Code>--accent-hue</Code> and <Code>--accent-chroma</Code> before the
          first paint.
        </p>

        <div className='grid gap-2'>
          <p className='text-sm text-strong'>
            Option 1 — React (<Code>&lt;head&gt;</Code> injection)
          </p>
          <p className='text-sm text-subtle'>
            For React frameworks (Next.js, Remix, etc.), inject the theme script
            and accent style as separate head children.
            <Code>getAccentStyleSync</Code> returns just the inner CSS body so
            you can wrap it in a real <Code>&lt;style&gt;</Code> element.
          </p>
          <CodePreview language='tsx'>
            {`// app/layout.tsx
import {
  getAccentStyleSync,
  getThemeScript
} from '@oztix/roadie-components'

export default async function RootLayout({ children }) {
  const collection = await fetchCollection()
  const accentHex = collection?.themeColour ?? null

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: getThemeScript({ followSystem: true })
          }}
        />
        {accentHex && (
          <style
            id="roadie-accent-theme"
            dangerouslySetInnerHTML={{
              __html: getAccentStyleSync(accentHex)
            }}
          />
        )}
      </head>
      <body>
        <ThemeProvider accentColor={accentHex}>{children}</ThemeProvider>
      </body>
    </html>
  )
}`}
          </CodePreview>
        </div>

        <div className='grid gap-2'>
          <p className='text-sm text-strong'>
            Option 2 — Framework-agnostic (<Code>getBootstrapScript</Code>)
          </p>
          <p className='text-sm text-subtle'>
            For Astro, Nuxt, or plain HTML, use <Code>getBootstrapScript</Code>.
            It returns a raw HTML string combining both the theme script and the
            accent style tag, ready to drop into <Code>&lt;head&gt;</Code>.
          </p>
          <CodePreview language='tsx'>
            {`// astro.page.astro
---
import { getBootstrapScript } from '@oztix/roadie-core/theme'

const html = getBootstrapScript({
  followSystem: true,
  accentColor: Astro.props.collection?.themeColour
})
---
<head>
  <Fragment set:html={html} />
</head>`}
          </CodePreview>
        </div>

        <p className='text-sm text-subtle'>
          Both paths use the same synchronous sRGB → OKLCH converter internally
          and match <Code>colorjs.io</Code>&apos;s output to four decimal
          places. Modern browsers (Chrome 111+, Safari 15.4+, Firefox 113+)
          render the accent scale from <Code>oklch()</Code> math directly, so
          the two custom properties are sufficient for a zero-flash cold load.
          Older browsers fall back to the compiled CSS accent until the
          client-side accent effect runs.
        </p>
      </section>

      {/* Resetting */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Resetting to the default
        </h2>
        <p className='text-subtle'>
          Roadie exports <Code>DEFAULT_ACCENT_COLOR</Code> so consumers never
          hardcode the default hex. Use it three ways:
        </p>
        <ul className='grid list-disc gap-2 pl-5 text-subtle'>
          <li>
            <p>
              In a controlled provider: pass{' '}
              <Code>accentColor={'{someHex ?? null}'}</Code> — Roadie coerces{' '}
              <Code>null</Code> back to the default.
            </p>
          </li>
          <li>
            <p>
              In an uncontrolled provider: call{' '}
              <Code>setAccentColor(DEFAULT_ACCENT_COLOR)</Code> from a reset
              button.
            </p>
          </li>
          <li>
            <p>
              In the bootstrap helpers: omit <Code>accentColor</Code> or pass{' '}
              <Code>null</Code> — the default CSS accent applies and the
              bootstrap emits no style tag.
            </p>
          </li>
        </ul>
      </section>

      {/* Dark mode integration */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Dark mode integration</h2>
        <p className='text-subtle'>
          Accent colour and dark mode are independent but share a single
          provider. <Code>getThemeScript</Code> prevents the
          flash-of-wrong-theme on initial load by reading{' '}
          <Code>localStorage</Code> before the first paint;{' '}
          <Code>getBootstrapScript</Code> composes that with the accent style
          tag into one head injection.
        </p>
        <CodePreview language='tsx'>
          {`<ThemeProvider
  accentColor={collection?.themeColour ?? null}
  followSystem
  defaultDark={false}
>
  {children}
</ThemeProvider>`}
        </CodePreview>
        <ul className='grid list-disc gap-2 pl-5 text-sm text-subtle'>
          <li>
            <Code>followSystem</Code> — respect{' '}
            <Code>prefers-color-scheme</Code> until the user explicitly toggles.
          </li>
          <li>
            <Code>defaultDark</Code> — initial dark state when no preference is
            stored.
          </li>
          <li>
            <Code>useTheme().setDark(boolean)</Code> — persist an explicit
            choice to <Code>localStorage</Code>.
          </li>
          <li>
            <Code>useTheme().isDark</Code> — current state, reactive.
          </li>
        </ul>
      </section>

      {/* Consumer recipes */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Recipes</h2>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            Theme from a tanstack-query hook
          </h3>
          <p className='text-sm text-subtle'>
            Fetch the accent, render the provider with <Code>accentColor</Code>,
            let loading states flow through <Code>null</Code>. No effects, no
            cleanup.
          </p>
          <CodePreview language='tsx'>
            {`function CollectionTheme({ slug, children }) {
  const { data } = useCollection(slug)
  return (
    <ThemeProvider accentColor={data?.themeColour ?? null}>
      {children}
    </ThemeProvider>
  )
}`}
          </CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            Per-route theming with Next.js App Router
          </h3>
          <p className='text-sm text-subtle'>
            A per-route <Code>layout.tsx</Code> can fetch its own data and wrap
            children in a scoped provider. Nesting overrides the parent provider
            — no global state to reset on navigation.
          </p>
          <CodePreview language='tsx'>
            {`// app/collections/[slug]/layout.tsx
export default async function CollectionLayout({ params, children }) {
  const { slug } = await params
  const collection = await getCollection(slug)
  return (
    <ThemeProvider accentColor={collection.themeColour ?? null}>
      {children}
    </ThemeProvider>
  )
}`}
          </CodePreview>
        </div>

        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>
            Static export with server-prefetched accent
          </h3>
          <p className='text-sm text-subtle'>
            For <Code>output: &apos;export&apos;</Code> apps, inject the accent
            style tag during the server pass so the first paint already uses the
            themed colours.
          </p>
          <CodePreview language='tsx'>
            {`// app/collections/[slug]/page.tsx
import { getAccentStyleSync } from '@oztix/roadie-components'

export async function generateStaticParams() {
  return (await listCollections()).map((c) => ({ slug: c.slug }))
}

export default async function CollectionPage({ params }) {
  const { slug } = await params
  const collection = await getCollection(slug)
  const css = collection.themeColour
    ? getAccentStyleSync(collection.themeColour)
    : null

  return (
    <>
      {css && (
        <style
          id="roadie-accent-theme"
          dangerouslySetInnerHTML={{ __html: css }}
        />
      )}
      <CollectionView collection={collection} />
    </>
  )
}`}
          </CodePreview>
        </div>
      </section>

      {/* Reference */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Reference</h2>
        <ul className='grid list-disc gap-2 pl-5 text-subtle'>
          <li>
            <Code>ThemeProvider</Code> — root provider for accent + dark mode.
            Accepts <Code>accentColor</Code>, <Code>defaultAccentColor</Code>,{' '}
            <Code>defaultDark</Code>, <Code>followSystem</Code>.
          </li>
          <li>
            <Code>useTheme()</Code> — returns{' '}
            <Code>{'{ accentColor, setAccentColor, isDark, setDark }'}</Code>.
          </li>
          <li>
            <Code>DEFAULT_ACCENT_COLOR</Code> — exported constant for the Oztix
            blue default.
          </li>
          <li>
            <Code>isValidHexColor(input)</Code> — sync type-guard for
            fetch-boundary validation.
          </li>
          <li>
            <Code>InvalidColorError</Code> — thrown by{' '}
            <Code>setAccentColor</Code>, <Code>getAccentStyleTagSync</Code>, and{' '}
            <Code>getAccentStyleSync</Code> on invalid input.
          </li>
          <li>
            <Code>getThemeScript(opts)</Code> — inline script body for dark-mode
            flash prevention.
          </li>
          <li>
            <Code>getAccentStyleSync(hex)</Code> — inner CSS body
            (React-friendly).
          </li>
          <li>
            <Code>getAccentStyleTagSync(hex)</Code> — full{' '}
            <Code>&lt;style&gt;</Code> tag (framework-agnostic).
          </li>
          <li>
            <Code>getAccentStyleTag(hex)</Code> — async variant with full hex
            fallbacks for non-OKLCH browsers.
          </li>
          <li>
            <Code>getBootstrapScript(opts)</Code> — unified helper combining
            theme script and accent style tag for a single head injection.
          </li>
        </ul>
        <p className='text-sm text-subtle'>
          Next steps:{' '}
          <Link href='/foundations/view-transitions'>view transitions</Link> for
          cross-route animation, or the{' '}
          <Link href='/foundations/colors'>colors</Link> page for the surface
          tokens the accent flows into.
        </p>
      </section>
    </div>
  )
}
