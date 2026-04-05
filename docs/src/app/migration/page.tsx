import Link from 'next/link'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Migrating to v2',
  description:
    'Guide for migrating from Roadie v1 (PandaCSS + Ark UI) to v2 (Tailwind CSS v4 + Base UI).'
}

const spacingMap = [
  { panda: "'0'", tw: '0', px: '0px' },
  { panda: "'25'", tw: '0.5', px: '2px' },
  { panda: "'50'", tw: '1', px: '4px' },
  { panda: "'75'", tw: '1.5', px: '6px' },
  { panda: "'100'", tw: '2', px: '8px' },
  { panda: "'125'", tw: '2.5', px: '10px' },
  { panda: "'150'", tw: '3', px: '12px' },
  { panda: "'200'", tw: '4', px: '16px' },
  { panda: "'250'", tw: '5', px: '20px' },
  { panda: "'300'", tw: '6', px: '24px' },
  { panda: "'350'", tw: '7', px: '28px' },
  { panda: "'400'", tw: '8', px: '32px' },
  { panda: "'500'", tw: '10', px: '40px' },
  { panda: "'600'", tw: '12', px: '48px' },
  { panda: "'700'", tw: '14', px: '56px' },
  { panda: "'800'", tw: '16', px: '64px' },
  { panda: "'900'", tw: '18', px: '72px' },
  { panda: "'1000'", tw: '20', px: '80px' }
]

const colorPaletteMap = [
  { v1: 'primary', v2: 'brand' },
  { v1: 'neutral', v2: 'neutral' },
  { v1: 'accent', v2: 'accent' },
  { v1: 'danger', v2: 'danger' },
  { v1: 'success', v2: 'success' },
  { v1: 'warning', v2: 'warning' },
  { v1: 'information', v2: 'info' }
]

const removedComponents = [
  {
    name: 'View',
    replacement: '<div> with Tailwind layout classes',
    link: '/foundations/layout'
  },
  {
    name: 'Container',
    replacement: '<div className="mx-auto max-w-*">',
    link: '/foundations/layout'
  },
  {
    name: 'Text',
    replacement: '<p>, <span> with utility classes',
    link: '/foundations/typography'
  },
  {
    name: 'Heading',
    replacement: '<h1>-<h6> with text-display-* utilities',
    link: '/foundations/typography'
  }
]

const newComponents = [
  { name: 'Prose', description: 'Rich content container for CMS/markdown' },
  { name: 'Badge', description: 'Status indicators with intent and emphasis' },
  { name: 'Card', description: 'Content container with elevation' },
  { name: 'Input', description: 'Text input with field-interactive states' },
  { name: 'Textarea', description: 'Multi-line text input' },
  { name: 'Field', description: 'Form field with label, helper, and error' },
  { name: 'Select', description: 'Dropdown with full sub-component API' },
  { name: 'Combobox', description: 'Searchable select with filtering' },
  { name: 'RadioGroup', description: 'Radio buttons with card appearance' },
  { name: 'Fieldset', description: 'Form group with legend' },
  { name: 'Accordion', description: 'Collapsible sections' },
  { name: 'Breadcrumb', description: 'Navigation breadcrumbs' },
  { name: 'Separator', description: 'Visual divider' }
]

export default function MigrationPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Migrating to v2</h1>
        <p className='text-lg text-subtle'>
          Roadie v2 replaces PandaCSS with Tailwind CSS v4 and Ark UI with Base
          UI. This guide covers every change you need to make.
        </p>
      </div>

      {/* ── Overview ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>What changed</h2>
        <div className='grid gap-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2 rounded-xl border border-subtle p-4'>
              <p className='text-sm font-bold text-subtle'>v1</p>
              <ul className='grid gap-1 text-sm'>
                <li>PandaCSS (CSS-in-JS)</li>
                <li>Ark UI primitives</li>
                <li>
                  <Code>colorPalette</Code> prop
                </li>
                <li>
                  <Code>View</Code>, <Code>Container</Code>, <Code>Text</Code>,{' '}
                  <Code>Heading</Code> components
                </li>
                <li>
                  <Code>styled()</Code>, <Code>css()</Code>, <Code>sva()</Code>
                </li>
                <li>Lucide icons</li>
              </ul>
            </div>
            <div className='grid gap-2 rounded-xl border border-subtle p-4 intent-accent'>
              <p className='text-sm font-bold text-subtle'>v2</p>
              <ul className='grid gap-1 text-sm'>
                <li>Tailwind CSS v4 (utility-first)</li>
                <li>Base UI primitives</li>
                <li>
                  <Code>intent</Code> + <Code>emphasis</Code> props
                </li>
                <li>Raw HTML elements + utility classes</li>
                <li>
                  CVA + <Code>cn()</Code> utility
                </li>
                <li>Phosphor icons (bold weight)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Setup ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Setup</h2>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>1. Remove PandaCSS</h3>
          <pre className='overflow-x-auto rounded-xl bg-raised p-4 text-sm'>
            <code>{`pnpm remove @pandacss/dev
rm panda.config.ts
rm -rf styled-system/`}</code>
          </pre>
          <p className='text-sm text-subtle'>
            Delete all generated PandaCSS artifacts. Remove any{' '}
            <Code>prepare</Code> or <Code>codegen</Code> scripts that ran{' '}
            <Code>panda codegen</Code>.
          </p>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            2. Install Tailwind v4
          </h3>
          <pre className='overflow-x-auto rounded-xl bg-raised p-4 text-sm'>
            <code>{`pnpm add -D tailwindcss@4 @tailwindcss/postcss`}</code>
          </pre>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            3. Update your CSS entry
          </h3>
          <pre className='overflow-x-auto rounded-xl bg-raised p-4 text-sm'>
            <code>{`/* app/globals.css */
@import '@oztix/roadie-core/css';

/* Scan component dist for Tailwind class strings */
@source "../../node_modules/@oztix/roadie-components/dist";`}</code>
          </pre>
          <p className='text-sm text-subtle'>
            The <Code>@source</Code> directive tells Tailwind to scan the
            component library so all component classes are included in your
            output CSS.
          </p>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            4. Update PostCSS config
          </h3>
          <pre className='overflow-x-auto rounded-xl bg-raised p-4 text-sm'>
            <code>{`// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}
  }
}`}</code>
          </pre>
        </div>
      </section>

      {/* ── Component removal ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Removed components</h2>
        <p className='text-subtle'>
          These components have been removed. Replace them with raw HTML
          elements and Tailwind utility classes.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='pr-4 pb-2 font-bold'>v1 component</th>
                <th className='pr-4 pb-2 font-bold'>v2 replacement</th>
                <th className='pb-2 font-bold'>Reference</th>
              </tr>
            </thead>
            <tbody>
              {removedComponents.map((comp) => (
                <tr key={comp.name} className='border-b border-subtler'>
                  <td className='py-2 pr-4'>
                    <Code>{comp.name}</Code>
                  </td>
                  <td className='py-2 pr-4'>
                    <code className='text-xs'>{comp.replacement}</code>
                  </td>
                  <td className='py-2'>
                    <Link
                      href={comp.link}
                      className='text-subtle underline underline-offset-2'
                    >
                      Foundation
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View examples */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>View migration</h3>
          <p className='text-sm text-subtle'>
            <Code>View</Code> was a flex-column layout primitive. Replace with{' '}
            <Code>div</Code> and Tailwind classes. v2 is grid-first — use{' '}
            <Code>grid</Code> for vertical stacks.
          </p>

          <div className='grid gap-3'>
            <p className='text-xs font-bold text-subtle'>
              Default vertical stack
            </p>
            <div className='grid grid-cols-2 gap-3'>
              <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
                <code>{`{/* v1 */}
<View gap='200'>
  <p>Item 1</p>
  <p>Item 2</p>
</View>`}</code>
              </pre>
              <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
                <code>{`{/* v2 */}
<div className='grid gap-4'>
  <p>Item 1</p>
  <p>Item 2</p>
</div>`}</code>
              </pre>
            </div>
          </div>

          <div className='grid gap-3'>
            <p className='text-xs font-bold text-subtle'>Horizontal row</p>
            <div className='grid grid-cols-2 gap-3'>
              <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
                <code>{`{/* v1 */}
<View
  flexDirection='row'
  gap='100'
  alignItems='center'
>
  <Icon />
  <p>Label</p>
</View>`}</code>
              </pre>
              <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
                <code>{`{/* v2 */}
<div className='flex items-center gap-2'>
  <Icon />
  <p>Label</p>
</div>`}</code>
              </pre>
            </div>
          </div>

          <div className='grid gap-3'>
            <p className='text-xs font-bold text-subtle'>Grid layout</p>
            <div className='grid grid-cols-2 gap-3'>
              <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
                <code>{`{/* v1 */}
<View
  display='grid'
  gridTemplateColumns='repeat(3, 1fr)'
  gap='200'
>
  {items}
</View>`}</code>
              </pre>
              <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
                <code>{`{/* v2 */}
<div className='grid grid-cols-3 gap-4'>
  {items}
</div>`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Container */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>Container migration</h3>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v1 */}
<Container>
  {content}
</Container>`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v2 */}
<div className='mx-auto max-w-7xl px-4'>
  {content}
</div>`}</code>
            </pre>
          </div>
        </div>

        {/* Text */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>Text migration</h3>
          <p className='text-sm text-subtle'>
            The <Code>Text</Code> component is removed. Use raw{' '}
            <Code>&lt;p&gt;</Code> or <Code>&lt;span&gt;</Code> with utility
            classes.
          </p>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v1 */}
<Text
  emphasis='subtle'
  size='sm'
>
  Secondary text
</Text>`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v2 */}
<p className='text-sm text-subtle'>
  Secondary text
</p>`}</code>
            </pre>
          </div>
        </div>

        {/* Heading */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>Heading migration</h3>
          <p className='text-sm text-subtle'>
            The <Code>Heading</Code> component is removed. Use raw heading
            elements with display text utilities.
          </p>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v1 */}
<Heading
  as='h1'
  textStyle='display.ui'
  level={1}
>
  Page title
</Heading>`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v2 */}
<h1 className='text-display-ui-1 text-strong'>
  Page title
</h1>`}</code>
            </pre>
          </div>
          <p className='text-sm text-subtle'>
            Two display style families are available:{' '}
            <Code>text-display-ui-1</Code> through <Code>6</Code> for UI
            headings, and <Code>text-display-prose-1</Code> through{' '}
            <Code>6</Code> for long-form content. See the{' '}
            <Link
              href='/foundations/typography'
              className='underline underline-offset-2'
            >
              Typography
            </Link>{' '}
            foundation.
          </p>
        </div>
      </section>

      {/* ── Prop changes ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Prop and API changes</h2>

        {/* colorPalette → intent */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            colorPalette is now intent
          </h3>
          <p className='text-sm text-subtle'>
            The <Code>colorPalette</Code> prop is renamed to <Code>intent</Code>
            . Some values are also renamed:
          </p>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-subtle text-left'>
                  <th className='pr-4 pb-2 font-bold'>
                    v1 <Code>colorPalette</Code>
                  </th>
                  <th className='pb-2 font-bold'>
                    v2 <Code>intent</Code>
                  </th>
                </tr>
              </thead>
              <tbody>
                {colorPaletteMap.map((row) => (
                  <tr key={row.v1} className='border-b border-subtler'>
                    <td className='py-2 pr-4'>
                      <Code>{row.v1}</Code>
                    </td>
                    <td className='py-2'>
                      <Code>{row.v2}</Code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v1 */}
<Button colorPalette='primary'>
  Save
</Button>`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v2 */}
<Button intent='brand' emphasis='strong'>
  Save
</Button>`}</code>
            </pre>
          </div>
        </div>

        {/* appearance → emphasis */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            appearance is now emphasis
          </h3>
          <p className='text-sm text-subtle'>
            The <Code>appearance</Code> prop is renamed to <Code>emphasis</Code>
            . This applies to Accordion and any custom components that used the
            old name.
          </p>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v1 */}
<Accordion appearance='contained'>
  ...
</Accordion>`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v2 */}
<Accordion emphasis='subtle'>
  ...
</Accordion>`}</code>
            </pre>
          </div>
        </div>

        {/* Dark mode */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>Dark mode</h3>
          <p className='text-sm text-subtle'>
            Dark mode is now class-based instead of data-attribute-based. The
            CSS also sets <Code>color-scheme</Code> so native browser UI
            (scrollbars, form controls) matches the active theme.
          </p>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v1 */}
<div data-color-mode='dark'>
  ...
</div>`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v2 */}
<div className='dark'>
  ...
</div>`}</code>
            </pre>
          </div>
          <p className='text-sm text-subtle'>
            Use <Code>getThemeScript()</Code> from{' '}
            <Code>@oztix/roadie-core/theme</Code> for flash-free SSR setup. For
            React apps, <Code>ThemeProvider</Code> now manages dark mode — use{' '}
            <Code>useTheme()</Code> instead of <Code>useAccent()</Code>.
          </p>
          <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
            <code>{`// Flash prevention (any framework — no React dependency)
import { getThemeScript } from '@oztix/roadie-core/theme'
// <script>{getThemeScript({ followSystem: true })}</script>

// React: useAccent() is deprecated, use useTheme()
import { useTheme } from '@oztix/roadie-components'
const { isDark, setDark, accentColor, setAccentColor } = useTheme()`}</code>
          </pre>
          <p className='text-sm text-subtle'>
            See the{' '}
            <Link
              href='/foundations/colors'
              className='underline underline-offset-2'
            >
              Colors
            </Link>{' '}
            foundation for full dark mode setup instructions.
          </p>
        </div>
      </section>

      {/* ── Intent and emphasis ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>
          The intent and emphasis system
        </h2>
        <p className='text-subtle'>
          v2 introduces a two-axis styling system. This is the most important
          concept to understand.
        </p>

        <div className='grid gap-4'>
          <div className='grid gap-2 rounded-xl border border-subtle p-4'>
            <p className='font-bold'>
              Intent = <em>which</em> color palette
            </p>
            <p className='text-sm text-subtle'>
              Sets CSS custom properties (<Code>--intent-*</Code>). No visual
              presentation on its own. Children inherit via CSS cascade.
            </p>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`<div className='intent-accent'>
  {/* Everything inside uses the accent palette */}
  <Button emphasis='strong'>Accent button</Button>
  <Badge>Accent badge</Badge>
</div>`}</code>
            </pre>
            <p className='text-xs text-subtle'>
              Available: <Code>neutral</Code>, <Code>brand</Code>,{' '}
              <Code>accent</Code>, <Code>danger</Code>, <Code>success</Code>,{' '}
              <Code>warning</Code>, <Code>info</Code>
            </p>
          </div>

          <div className='grid gap-2 rounded-xl border border-subtle p-4'>
            <p className='font-bold'>
              Emphasis = <em>how much</em> visual weight
            </p>
            <p className='text-sm text-subtle'>
              Combined shortcuts that set background, text, border, and
              interaction states together.
            </p>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`<Button emphasis='strong'>Primary action</Button>
<Button emphasis='normal'>Secondary</Button>
<Button emphasis='subtle'>Tertiary</Button>
<Card emphasis='raised'>Elevated card</Card>`}</code>
            </pre>
            <p className='text-xs text-subtle'>
              Available: <Code>strong</Code>, <Code>normal</Code>,{' '}
              <Code>subtle</Code>, <Code>subtler</Code>, <Code>raised</Code>,{' '}
              <Code>sunken</Code>, <Code>floating</Code>, <Code>inverted</Code>,{' '}
              <Code>overlay</Code>
            </p>
          </div>
        </div>

        <p className='text-sm text-subtle'>
          Components inherit their intent from the CSS cascade — you don&apos;t
          need to pass <Code>intent</Code> to every component. Wrap a section in{' '}
          <Code>intent-accent</Code> and all children pick it up automatically.
          See the{' '}
          <Link href='/tokens' className='underline underline-offset-2'>
            Tokens overview
          </Link>{' '}
          for the full architecture.
        </p>
      </section>

      {/* ── Spacing ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Spacing tokens</h2>
        <p className='text-subtle'>
          PandaCSS used string-based spacing tokens. Tailwind uses a numeric
          scale where <Code>1</Code> = 4px.
        </p>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='pr-4 pb-2 font-bold'>PandaCSS token</th>
                <th className='pr-4 pb-2 font-bold'>Tailwind value</th>
                <th className='pb-2 font-bold'>Pixels</th>
              </tr>
            </thead>
            <tbody>
              {spacingMap.map((row) => (
                <tr key={row.panda} className='border-b border-subtler'>
                  <td className='py-1.5 pr-4 font-mono text-xs'>{row.panda}</td>
                  <td className='py-1.5 pr-4 font-mono text-xs'>{row.tw}</td>
                  <td className='py-1.5 text-xs text-subtle'>{row.px}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className='text-sm text-subtle'>
          Apply spacing with Tailwind utilities: <Code>gap-4</Code>,{' '}
          <Code>p-6</Code>, <Code>m-2</Code>, etc.
        </p>
      </section>

      {/* ── Responsive ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Responsive syntax</h2>
        <p className='text-subtle'>
          PandaCSS used object-based responsive values. Tailwind uses breakpoint
          prefixes.
        </p>
        <div className='grid grid-cols-2 gap-3'>
          <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
            <code>{`{/* v1 — PandaCSS responsive object */}
<View
  padding={{ base: '200', md: '400' }}
  flexDirection={{
    base: 'column',
    md: 'row'
  }}
>
  {content}
</View>`}</code>
          </pre>
          <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
            <code>{`{/* v2 — Tailwind breakpoint prefixes */}
<div className='grid gap-4 p-4 md:flex md:flex-row md:p-8'>
  {content}
</div>`}</code>
          </pre>
        </div>
        <p className='text-sm text-subtle'>
          Tailwind breakpoints: <Code>sm</Code> (640px), <Code>md</Code>{' '}
          (768px), <Code>lg</Code> (1024px), <Code>xl</Code> (1280px),{' '}
          <Code>2xl</Code> (1536px). Mobile-first — unprefixed classes apply at
          all sizes.
        </p>
      </section>

      {/* ── CSS-in-JS removal ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>
          Removing CSS-in-JS patterns
        </h2>
        <p className='text-subtle'>
          All PandaCSS runtime APIs are replaced with Tailwind utility classes
          and CVA.
        </p>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            css() and inline styles
          </h3>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v1 */}
import { css } from 'styled-system/css'

<div className={css({
  display: 'flex',
  gap: '200',
  padding: '400',
  bg: 'neutral.2'
})}>
  {content}
</div>`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`{/* v2 */}
<div className='flex gap-4 p-8 bg-subtle'>
  {content}
</div>`}</code>
            </pre>
          </div>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            sva() and cva() recipes
          </h3>
          <p className='text-sm text-subtle'>
            Replace PandaCSS slot recipes with{' '}
            <Link
              href='https://cva.style'
              className='underline underline-offset-2'
            >
              class-variance-authority
            </Link>{' '}
            (CVA) and Tailwind classes.
          </p>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`// v1 — PandaCSS recipe
import { sva } from 'styled-system/css'

const card = sva({
  slots: ['root', 'header', 'body'],
  base: {
    root: { bg: 'neutral.1', p: '400' },
    header: { fontWeight: 'bold' },
    body: { color: 'neutral.11' }
  }
})`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`// v2 — CVA + Tailwind
import { cva } from 'class-variance-authority'
import { cn } from '@oztix/roadie-core/utils'

const cardVariants = cva(
  'rounded-xl emphasis-raised p-8', {
  variants: {
    emphasis: {
      raised: 'emphasis-raised',
      subtle: 'emphasis-subtle',
    }
  }
})`}</code>
            </pre>
          </div>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>styled() factory</h3>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`// v1 — PandaCSS styled factory
import { styled } from 'styled-system/jsx'

const StyledCard = styled('div', {
  base: { bg: 'neutral.1', p: '400' }
})`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`// v2 — Plain component + cn()
import { cn } from '@oztix/roadie-core/utils'

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl emphasis-raised p-8',
        className
      )}
      {...props}
    />
  )
}`}</code>
            </pre>
          </div>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>splitCssProps()</h3>
          <p className='text-sm text-subtle'>
            <Code>splitCssProps()</Code> is removed. Since v2 uses{' '}
            <Code>className</Code> strings instead of CSS-in-JS props, there are
            no CSS props to split. Simply spread all props to the element.
          </p>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>Import cleanup</h3>
          <p className='text-sm text-subtle'>Remove all PandaCSS imports:</p>
          <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
            <code>{`// Remove all of these:
import { css } from 'styled-system/css'
import { styled } from 'styled-system/jsx'
import { sva, cva } from 'styled-system/css'
import { token } from 'styled-system/tokens'
import { View, Container } from 'styled-system/jsx'
import type { HTMLStyledProps } from 'styled-system/jsx'
import type { JsxStyleProps } from 'styled-system/types'`}</code>
          </pre>
        </div>
      </section>

      {/* ── Icons ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Icon migration</h2>
        <p className='text-subtle'>
          v2 uses{' '}
          <Link
            href='https://phosphoricons.com/'
            className='underline underline-offset-2'
          >
            Phosphor Icons
          </Link>{' '}
          instead of Lucide. Always use <Code>bold</Code> weight.
        </p>

        <div className='grid gap-4'>
          <div className='grid grid-cols-2 gap-3'>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`// v1 — Lucide
import { Heart } from 'lucide-react'

<Heart size={16} />`}</code>
            </pre>
            <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
              <code>{`// v2 — Phosphor (client component)
import { HeartIcon } from '@phosphor-icons/react'

<HeartIcon weight='bold' className='size-4' />`}</code>
            </pre>
          </div>

          <div className='grid gap-3 rounded-xl border border-subtle p-4'>
            <p className='text-sm font-bold'>Key differences</p>
            <ul className='grid gap-2 text-sm text-subtle'>
              <li>
                Use the <Code>Icon</Code> suffix: <Code>HeartIcon</Code> not{' '}
                <Code>Heart</Code>
              </li>
              <li>
                Set size with <Code>className</Code>, not the <Code>size</Code>{' '}
                prop: <Code>className=&apos;size-4&apos;</Code>
              </li>
              <li>
                Always set <Code>weight=&apos;bold&apos;</Code>
              </li>
              <li>
                Use <Code>@phosphor-icons/react/ssr</Code> in server components
              </li>
              <li>
                Sizing tiers: <Code>size-3</Code> (XS), <Code>size-4</Code>{' '}
                (SM/default), <Code>size-5</Code> (MD), <Code>size-6</Code> (LG)
              </li>
            </ul>
          </div>

          <p className='text-sm text-subtle'>
            See the{' '}
            <Link
              href='/foundations/iconography'
              className='underline underline-offset-2'
            >
              Iconography
            </Link>{' '}
            foundation for complete guidelines.
          </p>
        </div>
      </section>

      {/* ── Semantic colors ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Color utilities</h2>
        <p className='text-subtle'>
          Default Tailwind color utilities (<Code>bg-red-500</Code>,{' '}
          <Code>text-blue-300</Code>) are disabled. Use semantic color utilities
          instead.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='pr-4 pb-2 font-bold'>Purpose</th>
                <th className='pr-4 pb-2 font-bold'>Utility</th>
                <th className='pb-2 font-bold'>Use for</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Background', 'bg-normal', 'Page background'],
                ['', 'bg-subtle', 'Tinted surface'],
                ['', 'bg-raised', 'Elevated card'],
                ['', 'bg-sunken', 'Recessed area'],
                ['Text', 'text-normal', 'Body text'],
                ['', 'text-subtle', 'Secondary text'],
                ['', 'text-strong', 'Headings'],
                ['Border', 'border-subtle', 'Dividers'],
                ['', 'border-normal', 'Standard borders']
              ].map(([purpose, utility, use], i) => (
                <tr key={i} className='border-b border-subtler'>
                  <td className='py-1.5 pr-4 text-xs font-bold'>{purpose}</td>
                  <td className='py-1.5 pr-4'>
                    <Code>{utility}</Code>
                  </td>
                  <td className='py-1.5 text-xs text-subtle'>{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className='text-sm text-subtle'>
          These utilities respond to the current intent context. Inside an{' '}
          <Code>intent-danger</Code> wrapper, <Code>bg-subtle</Code> uses the
          danger scale. See the{' '}
          <Link
            href='/foundations/colors'
            className='underline underline-offset-2'
          >
            Colors
          </Link>{' '}
          foundation.
        </p>
      </section>

      {/* ── New concepts ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>New in v2</h2>
        <p className='text-subtle'>
          These features have no v1 equivalent. Adopt them as needed.
        </p>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>
            Interaction utilities
          </h3>
          <p className='text-sm text-subtle'>
            Two CSS utilities handle interactive element styling:
          </p>
          <ul className='grid gap-2 text-sm text-subtle'>
            <li>
              <Code>is-interactive</Code> — for buttons, cards, clickable
              elements. Provides cursor, transitions, active scale, focus ring,
              disabled state.
            </li>
            <li>
              <Code>is-interactive-field</Code> — for form inputs. Provides
              state-based color transitions: neutral at rest, accent on focus,
              danger when invalid.
            </li>
            <li>
              <Code>is-interactive-field-group</Code> — for composite form
              controls like the Combobox input group.
            </li>
          </ul>
          <p className='text-sm text-subtle'>
            See{' '}
            <Link
              href='/foundations/interactions'
              className='underline underline-offset-2'
            >
              Interactions
            </Link>{' '}
            foundation.
          </p>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>Motion tokens</h3>
          <p className='text-sm text-subtle'>
            Duration and easing tokens replace hardcoded animation values. All
            motion respects <Code>prefers-reduced-motion</Code> automatically.
          </p>
          <pre className='overflow-x-auto rounded-lg bg-raised p-3 text-xs'>
            <code>{`/* Use tokens for custom transitions */
.my-element {
  transition:
    opacity var(--duration-moderate) var(--ease-standard),
    transform var(--duration-slow) var(--ease-enter);
}

/* Or use built-in motion utilities */
.entering {
  animation: motion-fade-in var(--duration-slow) var(--ease-enter);
}`}</code>
          </pre>
          <p className='text-sm text-subtle'>
            See{' '}
            <Link
              href='/foundations/motion'
              className='underline underline-offset-2'
            >
              Motion
            </Link>{' '}
            foundation.
          </p>
        </div>

        <div className='grid gap-4'>
          <h3 className='text-display-ui-4 text-strong'>Shape tiers</h3>
          <p className='text-sm text-subtle'>
            Consistent border-radius tiers across all components:
          </p>
          <ul className='grid gap-1 text-sm text-subtle'>
            <li>
              <Code>rounded-sm</Code> — inline (marks, highlights)
            </li>
            <li>
              <Code>rounded-md</Code> — small (code, prose images)
            </li>
            <li>
              <Code>rounded-lg</Code> — field (inputs, textareas)
            </li>
            <li>
              <Code>rounded-xl</Code> — container (cards, popovers)
            </li>
            <li>
              <Code>rounded-2xl</Code> — large (modals, dialogs)
            </li>
            <li>
              <Code>rounded-full</Code> — buttons, badges, pills
            </li>
          </ul>
          <p className='text-sm text-subtle'>
            See{' '}
            <Link
              href='/foundations/shape'
              className='underline underline-offset-2'
            >
              Shape
            </Link>{' '}
            foundation.
          </p>
        </div>
      </section>

      {/* ── New components ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>New components</h2>
        <p className='text-subtle'>
          v2 adds 13 new components. Browse the{' '}
          <Link href='/components' className='underline underline-offset-2'>
            component docs
          </Link>{' '}
          for usage examples.
        </p>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='pr-4 pb-2 font-bold'>Component</th>
                <th className='pb-2 font-bold'>Description</th>
              </tr>
            </thead>
            <tbody>
              {newComponents.map((comp) => (
                <tr key={comp.name} className='border-b border-subtler'>
                  <td className='py-1.5 pr-4'>
                    <Link
                      href={`/components/${comp.name
                        .toLowerCase()
                        .replace(/([a-z])([A-Z])/g, '$1-$2')
                        .toLowerCase()}`}
                      className='underline underline-offset-2'
                    >
                      <Code>{comp.name}</Code>
                    </Link>
                  </td>
                  <td className='py-1.5 text-xs text-subtle'>
                    {comp.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Quick reference ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Quick reference</h2>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='pr-4 pb-2 font-bold'>v1 pattern</th>
                <th className='pb-2 font-bold'>v2 replacement</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "import { css } from 'styled-system/css'",
                  'Tailwind utility classes'
                ],
                [
                  "import { styled } from 'styled-system/jsx'",
                  "cn() from '@oztix/roadie-core/utils'"
                ],
                ['sva() / cva() recipes', 'CVA (class-variance-authority)'],
                ['splitCssProps()', 'Removed — not needed'],
                ['<View>', '<div className="grid gap-*">'],
                ['<Container>', '<div className="mx-auto max-w-*">'],
                ['<Text>', '<p>, <span> + utility classes'],
                ['<Heading>', '<h1>-<h6> + text-display-* utilities'],
                ['colorPalette="primary"', 'intent="brand"'],
                ['colorPalette="information"', 'intent="info"'],
                ['appearance="contained"', 'emphasis="subtle"'],
                ["data-color-mode='dark'", "className='dark'"],
                ['useAccent()', 'useTheme() from @oztix/roadie-components'],
                [
                  'Hand-rolled theme script',
                  "getThemeScript() from '@oztix/roadie-core/theme'"
                ],
                ["gap='200'", 'className="gap-4"'],
                ['{{ base: "x", md: "y" }}', '"x md:y"'],
                ['Lucide icons', 'Phosphor icons (bold, Icon suffix)'],
                [
                  '@ark-ui/react',
                  '@base-ui/react (used internally by components)'
                ]
              ].map(([v1, v2], i) => (
                <tr key={i} className='border-b border-subtler'>
                  <td className='py-1.5 pr-4 font-mono text-xs'>{v1}</td>
                  <td className='py-1.5 font-mono text-xs'>{v2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Next steps ── */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Next steps</h2>
        <ul className='grid gap-2 text-subtle'>
          <li>
            Browse the{' '}
            <Link href='/components' className='underline underline-offset-2'>
              component docs
            </Link>{' '}
            for usage examples and live previews
          </li>
          <li>
            Read the{' '}
            <Link href='/tokens' className='underline underline-offset-2'>
              token system overview
            </Link>{' '}
            to understand the intent/emphasis architecture
          </li>
          <li>
            Review the{' '}
            <Link
              href='/foundations/colors'
              className='underline underline-offset-2'
            >
              foundation pages
            </Link>{' '}
            for detailed styling guidance
          </li>
        </ul>
      </section>
    </div>
  )
}
