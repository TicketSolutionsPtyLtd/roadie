import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Colors',
  description:
    'OKLCH color system with intent-based semantic tokens for consistent theming.'
}

const intents = [
  'neutral',
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
] as const
const steps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

function ColorScale({ intent }: { intent: string }) {
  return (
    <div className='grid gap-1'>
      <p className='text-sm text-strong capitalize'>{intent}</p>
      <div className='flex gap-0.5'>
        {steps.map((step) => (
          <div
            key={step}
            className='h-10 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md'
            style={{ backgroundColor: `var(--color-${intent}-${step})` }}
            title={`${intent}-${step}`}
          />
        ))}
      </div>
      <div className='flex gap-0.5'>
        {steps.map((step) => (
          <p key={step} className='flex-1 text-center text-xs text-subtler'>
            {step}
          </p>
        ))}
      </div>
    </div>
  )
}

function IntentDemo({ intent }: { intent: string }) {
  return (
    <div className={`intent-${intent} grid gap-3`}>
      <p className='text-sm text-strong capitalize'>{intent}</p>
      <div className='flex flex-wrap gap-2'>
        <div className='emphasis-strong rounded-md px-3 py-1.5 text-sm'>
          emphasis-strong
        </div>
        <div className='emphasis-normal rounded-md px-3 py-1.5 text-sm'>
          emphasis-normal
        </div>
        <div className='rounded-md emphasis-subtle px-3 py-1.5 text-sm'>
          emphasis-subtle
        </div>
        <div className='rounded-md emphasis-subtler px-3 py-1.5 text-sm'>
          emphasis-subtler
        </div>
      </div>
    </div>
  )
}

export default function ColorsPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Colors</h1>
        <p className='text-lg text-subtle'>
          Roadie uses OKLCH color scales with 14 steps (0-13) per intent. Colors
          are applied through three utility types: <Code>bg-*</Code>,{' '}
          <Code>text-*</Code>, and <Code>border-*</Code> — each scoped to its
          own CSS property.
        </p>
      </div>

      {/* Color scales */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Color scales</h2>
        <p className='text-subtle'>
          Each intent has a 14-step OKLCH scale. Step 0 is the lightest extreme,
          step 13 the darkest. Dark mode swaps the values — step numbers stay
          the same.
        </p>
        <div className='grid gap-6'>
          {intents.map((intent) => (
            <ColorScale key={intent} intent={intent} />
          ))}
        </div>
      </section>

      {/* Utility system */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Color utilities</h2>
        <p className='text-subtle'>
          Three utility namespaces for applying colors. Each maps semantic
          levels to specific scale steps via the current intent.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle'>
                <th className='py-2 pr-4 text-left font-semibold'>Level</th>
                <th className='py-2 pr-4 text-left font-semibold'>
                  <Code>bg-*</Code>
                </th>
                <th className='py-2 pr-4 text-left font-semibold'>
                  <Code>text-*</Code>
                </th>
                <th className='py-2 text-left font-semibold'>
                  <Code>border-*</Code>
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              <tr>
                <td className='py-2 pr-4 text-strong'>subtler</td>
                <td className='py-2 pr-4'>step 9 @ 6% alpha</td>
                <td className='py-2 pr-4'>step 10</td>
                <td className='py-2'>step 5</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>subtle</td>
                <td className='py-2 pr-4'>step 9 @ 11% alpha</td>
                <td className='py-2 pr-4'>step 11</td>
                <td className='py-2'>step 6</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>normal</td>
                <td className='py-2 pr-4'>step 1</td>
                <td className='py-2 pr-4'>step 12</td>
                <td className='py-2'>step 7</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>strong</td>
                <td className='py-2 pr-4'>step 9 (neutral: 12)</td>
                <td className='py-2 pr-4'>step 13</td>
                <td className='py-2'>step 9</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>inverted</td>
                <td className='py-2 pr-4'>step 12</td>
                <td className='py-2 pr-4'>step 0</td>
                <td className='py-2'>step 12</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>raised</td>
                <td className='py-2 pr-4'>step 1 (dark: 2-3)</td>
                <td className='py-2 pr-4'>—</td>
                <td className='py-2'>—</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>sunken</td>
                <td className='py-2 pr-4'>step 2 (dark: 0)</td>
                <td className='py-2 pr-4'>—</td>
                <td className='py-2'>—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className='grid gap-2'>
          <p className='text-sm text-strong'>Usage</p>
          <div className='flex flex-wrap gap-2'>
            <Code>bg-normal</Code>
            <Code>bg-subtle</Code>
            <Code>bg-raised</Code>
            <Code>text-subtle</Code>
            <Code>text-strong</Code>
            <Code>border-subtle</Code>
            <Code>border-b-subtler</Code>
            <Code>divide-subtler</Code>
          </div>
        </div>
      </section>

      {/* Intent + emphasis */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Intent + emphasis</h2>
        <p className='text-subtle'>
          Set <Code>intent-*</Code> on a container to choose the color palette.
          Use <Code>emphasis-*</Code> shortcuts for combined bg + text +
          interactive states, or individual utilities for composability.
        </p>
        <div className='grid gap-6'>
          {intents.map((intent) => (
            <IntentDemo key={intent} intent={intent} />
          ))}
        </div>
      </section>

      {/* Dark mode */}
      <section className='grid gap-6'>
        <div className='grid gap-4'>
          <h2 className='text-display-ui-3 text-strong'>Dark mode</h2>
          <p className='text-subtle'>
            Automatic. The <Code>.dark</Code> class on <Code>&lt;html&gt;</Code>{' '}
            swaps all OKLCH values. No <Code>dark:</Code> Tailwind variants
            needed — <Code>bg-normal</Code>, <Code>text-subtle</Code>,{' '}
            <Code>border-subtle</Code> all adapt automatically.
          </p>
          <p className='text-subtle'>
            The CSS also sets <Code>color-scheme: light</Code> on{' '}
            <Code>:root</Code> and <Code>color-scheme: dark</Code> on{' '}
            <Code>.dark</Code>, so native browser UI (scrollbars, form controls)
            matches your theme.
          </p>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>Setup</h3>
          <p className='text-sm text-subtle'>
            Add a blocking script in <Code>&lt;head&gt;</Code> to prevent flash
            of wrong theme. The <Code>getThemeScript</Code> helper generates
            this for you — import from <Code>@oztix/roadie-core/theme</Code> (no
            React dependency).
          </p>
          <pre className='overflow-x-auto rounded-xl bg-raised p-4 text-xs'>
            <code>{`import { getThemeScript } from '@oztix/roadie-core/theme'

// In your <head>:
<meta name="color-scheme" content="light" />
<script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />`}</code>
          </pre>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            Following system preference
          </h3>
          <p className='text-sm text-subtle'>
            By default, the theme is light. Pass <Code>followSystem: true</Code>{' '}
            to respect the user&apos;s OS preference when they haven&apos;t
            explicitly toggled.
          </p>
          <pre className='overflow-x-auto rounded-xl bg-raised p-4 text-xs'>
            <code>{`getThemeScript({ followSystem: true })`}</code>
          </pre>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            React: ThemeProvider
          </h3>
          <p className='text-sm text-subtle'>
            For React apps, wrap your app in <Code>ThemeProvider</Code> to get
            the <Code>useTheme()</Code> hook with <Code>isDark</Code> and{' '}
            <Code>setDark</Code>.
          </p>
          <pre className='overflow-x-auto rounded-xl bg-raised p-4 text-xs'>
            <code>{`import { ThemeProvider, useTheme } from '@oztix/roadie-components'

// In your layout:
<ThemeProvider followSystem>
  <App />
</ThemeProvider>

// In a toggle component:
function ThemeToggle() {
  const { isDark, setDark } = useTheme()
  return <button onClick={() => setDark(!isDark)}>{isDark ? 'Light' : 'Dark'}</button>
}`}</code>
          </pre>
          <p className='text-sm text-subtle'>
            Once a user explicitly toggles, their choice persists in{' '}
            <Code>localStorage</Code> and overrides the system preference.
          </p>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>Vue / vanilla JS</h3>
          <p className='text-sm text-subtle'>
            For non-React apps, use <Code>getThemeScript()</Code> for initial
            load and toggle with plain DOM calls.
          </p>
          <pre className='overflow-x-auto rounded-xl bg-raised p-4 text-xs'>
            <code>{`function setDark(dark) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}`}</code>
          </pre>
        </div>
      </section>

      {/* Dynamic accent */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Dynamic accent</h2>
        <p className='text-subtle'>
          The accent scale is CSS-native. The <Code>ThemeProvider</Code> sets{' '}
          <Code>--accent-hue</Code> and <Code>--accent-chroma</Code> — CSS{' '}
          <Code>oklch()</Code> computes all accent and neutral colors in the
          browser. No JavaScript color generation needed for modern browsers.
        </p>
      </section>
    </div>
  )
}
