import { CodePreview } from '@/components/CodePreview'
import { Guideline } from '@/components/Guideline'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Typography',
  description:
    'Fluid type scale, pre-composed text styles, and semantic text colors.'
}

const typeScale = [
  { token: 'text-xs', value: '12px', rem: '0.75rem' },
  { token: 'text-sm', value: '14px', rem: '0.875rem' },
  { token: 'text-base', value: '16px', rem: '1rem' },
  { token: 'text-lg', value: '18-20px', rem: 'clamp()' },
  { token: 'text-xl', value: '20-24px', rem: 'clamp()' },
  { token: 'text-2xl', value: '24-32px', rem: 'clamp()' },
  { token: 'text-3xl', value: '28-40px', rem: 'clamp()' },
  { token: 'text-4xl', value: '32-48px', rem: 'clamp()' },
  { token: 'text-5xl', value: '36-64px', rem: 'clamp()' }
]

const displayUiStyles = [
  { utility: 'text-display-ui-1', size: '4xl', weight: 'Bold (700)' },
  { utility: 'text-display-ui-2', size: '3xl', weight: 'Bold (700)' },
  { utility: 'text-display-ui-3', size: '2xl', weight: 'Bold (700)' },
  { utility: 'text-display-ui-4', size: 'xl', weight: 'Bold (700)' },
  { utility: 'text-display-ui-5', size: 'lg', weight: 'Semibold (600)' },
  { utility: 'text-display-ui-6', size: 'base', weight: 'Semibold (600)' }
]

const displayProseStyles = [
  {
    utility: 'text-display-prose-1',
    size: '5xl',
    weight: 'Black (900)'
  },
  {
    utility: 'text-display-prose-2',
    size: '4xl',
    weight: 'Extrabold (800)'
  },
  { utility: 'text-display-prose-3', size: '3xl', weight: 'Bold (700)' },
  { utility: 'text-display-prose-4', size: '2xl', weight: 'Bold (700)' },
  { utility: 'text-display-prose-5', size: 'xl', weight: 'Bold (700)' },
  { utility: 'text-display-prose-6', size: 'lg', weight: 'Bold (700)' }
]

export default function TypographyPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Typography</h1>
        <p className='text-lg text-subtle'>
          Use pre-composed text styles. Let fluid type handle responsiveness.
          Pair semantic colors with semantic HTML.
        </p>
        <p className='text-sm text-subtler'>
          Two font families: <strong>Intermission</strong> (sans-serif, via{' '}
          <Code>font-sans</Code>) and <strong>IBM Plex Mono</strong> (monospace,
          via <Code>font-mono</Code>).
        </p>
      </div>

      {/* Type scale */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Type scale</h2>
        <p className='text-subtle'>
          Sizes <Code>text-lg</Code> and above use <Code>clamp()</Code> for
          fluid scaling between viewport widths. No manual breakpoint overrides
          needed.
        </p>

        <div className='grid gap-1 overflow-x-auto rounded-xl border border-subtle bg-subtle p-4'>
          {typeScale.map(({ token, value }) => (
            <div key={token} className='flex items-baseline gap-4'>
              <p className='w-20 shrink-0 text-right text-sm text-strong tabular-nums'>
                {token.replace('text-', '')}
              </p>
              <p className={`${token} shrink-0 text-normal`}>
                The quick brown fox
              </p>
              <p className='shrink-0 text-xs text-subtler'>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Text style utilities */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Text style utilities</h2>
        <p className='text-subtle'>
          Pre-composed utilities that combine font size, weight, line height,
          and letter spacing. Two contexts: <strong>UI</strong> for app
          interfaces and <strong>Prose</strong> for long-form content.
        </p>

        {/* UI vs Prose comparison */}
        <div className='grid items-start gap-4 sm:grid-cols-2'>
          <div className='grid emphasis-raised content-start gap-3 rounded-xl p-6'>
            <h3 className='text-display-ui-5 text-strong'>UI display styles</h3>
            <p className='text-sm text-subtle'>
              Compact headings for dashboards, settings, navigation. Tighter
              line height and tracking.
            </p>
            <div className='grid gap-2'>
              {displayUiStyles.map(({ utility, weight }) => (
                <div key={utility} className='grid gap-0.5'>
                  <p className={`${utility} text-strong`}>
                    {utility.replace('text-display-', '')}
                  </p>
                  <p className='text-xs text-subtler'>{weight}</p>
                  <p className='font-mono text-xs text-subtler'>{utility}</p>
                </div>
              ))}
            </div>
          </div>
          <div className='grid emphasis-raised content-start gap-3 rounded-xl p-6'>
            <h3 className='text-display-ui-5 text-strong'>
              Prose display styles
            </h3>
            <p className='text-sm text-subtle'>
              Larger, heavier headings for articles, marketing pages, rich
              content. Designed for reading.
            </p>
            <div className='grid gap-2'>
              {displayProseStyles.map(({ utility, weight }) => (
                <div key={utility} className='grid gap-0.5'>
                  <p className={`${utility} text-strong`}>
                    {utility.replace('text-display-', '')}
                  </p>
                  <p className='text-xs text-subtler'>{weight}</p>
                  <p className='font-mono text-xs text-subtler'>{utility}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body text styles */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-5 text-strong'>Body text styles</h3>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='grid gap-2 rounded-xl emphasis-sunken p-4'>
              <p className='text-display-ui-6 text-strong'>text-ui</p>
              <p className='text-ui'>
                App interface text with tighter line height (1.35). Default on
                body — no class needed for standard UI text.
              </p>
              <p className='text-xs text-subtler'>
                Base size, 1.35 line height, -0.01em tracking
              </p>
            </div>
            <div className='grid gap-2 rounded-xl emphasis-sunken p-4'>
              <p className='text-display-ui-6 text-strong'>text-prose</p>
              <p className='text-prose'>
                Long-form content with more generous line height (1.5). Better
                for extended reading like articles and documentation.
              </p>
              <p className='text-xs text-subtler'>
                Base size, 1.5 line height, -0.01em tracking
              </p>
            </div>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='grid gap-2 rounded-xl emphasis-sunken p-4'>
              <p className='text-display-ui-6 text-strong'>text-ui-meta</p>
              <p className='text-ui-meta'>
                Secondary UI text like timestamps, counts, and helper text.
              </p>
              <p className='text-xs text-subtler'>
                Small size, 1.35 line height
              </p>
            </div>
            <div className='grid gap-2 rounded-xl emphasis-sunken p-4'>
              <p className='text-display-ui-6 text-strong'>text-code</p>
              <p className='text-code'>
                const roadie = &apos;monospaced code text&apos;
              </p>
              <p className='text-xs text-subtler'>
                Small size, 1.625 line height, monospace font
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Semantic text colors */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Semantic text colors</h2>
        <p className='text-subtle'>
          Use semantic color utilities instead of raw color values. They adapt
          to intents, themes, and dark mode automatically.
        </p>

        <div className='grid gap-1 rounded-xl border border-subtle bg-subtle p-4'>
          <p className='text-strong'>
            text-strong — headings, emphasis, high contrast
          </p>
          <p className='text-normal'>
            text-normal — body text (inherited from body reset)
          </p>
          <p className='text-subtle'>
            text-subtle — secondary text, descriptions
          </p>
          <p className='text-subtler'>
            text-subtler — meta text, timestamps, hints
          </p>
        </div>
      </section>

      {/* Usage */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Usage</h2>

        <div className='grid gap-6'>
          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Headings</h3>
            <p className='text-sm text-subtle'>
              Use raw heading elements with a display style utility and{' '}
              <Code>text-strong</Code>. Match semantic level (h1-h6) to document
              structure, visual style to context.
            </p>
            <CodePreview language='tsx-live'>
              {`<div className="grid gap-2">
  <h1 className="text-display-ui-1 text-strong">Page title</h1>
  <h2 className="text-display-ui-3 text-strong">Section</h2>
  <h3 className="text-display-ui-5 text-strong">Subsection</h3>
</div>`}
            </CodePreview>
          </div>

          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Body text</h3>
            <p className='text-sm text-subtle'>
              Body inherits <Code>text-ui</Code> from the reset. Just use{' '}
              <Code>&lt;p&gt;</Code> elements with semantic color classes.
            </p>
            <CodePreview language='tsx-live'>
              {`<div className="grid gap-2">
  <p>Default body text — no class needed</p>
  <p className="text-subtle">Secondary text</p>
  <p className="text-sm text-subtler">Meta / hint text</p>
  <p className="text-strong">Emphasised text</p>
</div>`}
            </CodePreview>
          </div>

          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Prose content</h3>
            <p className='text-sm text-subtle'>
              Wrap CMS output, markdown, or user-generated content in{' '}
              <Code>&lt;Prose&gt;</Code> for automatic typography and spacing.
            </p>
            <CodePreview language='tsx-live'>
              {`<Prose>
  <h2>Article heading</h2>
  <p>
    Body paragraph with <strong>bold</strong> and{' '}
    <a href="#">links</a>. The Prose component handles spacing,
    list styles, and element typography.
  </p>
  <ul>
    <li>List item one</li>
    <li>List item two</li>
  </ul>
</Prose>`}
            </CodePreview>
          </div>
        </div>
      </section>

      {/* Line height and tracking */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Line height and tracking
        </h2>
        <p className='text-subtle'>
          Semantic tokens for consistent rhythm. Text style utilities set these
          automatically — use individual tokens only for custom compositions.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle'>
                <th className='py-2 pr-4 text-left font-semibold'>Context</th>
                <th className='py-2 pr-4 text-left font-semibold'>
                  Line height
                </th>
                <th className='py-2 text-left font-semibold'>Letter spacing</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              <tr>
                <td className='py-2 pr-4'>
                  <Code>display</Code>
                </td>
                <td className='py-2 pr-4'>1.2</td>
                <td className='py-2'>-0.02em</td>
              </tr>
              <tr>
                <td className='py-2 pr-4'>
                  <Code>ui</Code>
                </td>
                <td className='py-2 pr-4'>1.35</td>
                <td className='py-2'>-0.01em</td>
              </tr>
              <tr>
                <td className='py-2 pr-4'>
                  <Code>prose</Code>
                </td>
                <td className='py-2 pr-4'>1.5</td>
                <td className='py-2'>-0.01em</td>
              </tr>
              <tr>
                <td className='py-2 pr-4'>
                  <Code>code</Code>
                </td>
                <td className='py-2 pr-4'>1.625</td>
                <td className='py-2'>0em</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Guidelines */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Guidelines</h2>

        <Guideline
          title='Use text style utilities'
          description={
            <>
              Text style utilities combine size, weight, line height, and letter
              spacing into a single class. Raw Tailwind size classes miss the
              other properties.
            </>
          }
        >
          <Guideline.Do
            example={
              <div className='grid gap-2'>
                <h2 className='text-display-ui-3 text-strong'>Section title</h2>
                <p>Body text inherits defaults</p>
                <p className='text-sm text-subtle'>Secondary text</p>
              </div>
            }
            code={`<h2 className="text-display-ui-3 text-strong">Section title</h2>
<p>Body text inherits defaults</p>
<p className="text-sm text-subtle">Secondary text</p>`}
          >
            Use pre-composed utilities — they set all typographic properties at
            once.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='grid gap-2'>
                <h2 className='text-2xl font-bold'>Section title</h2>
                <p>Body text</p>
                <p className='text-gray-500 text-sm'>Secondary text</p>
              </div>
            }
            code={`<h2 className="text-2xl font-bold">Section title</h2>
<p>Body text</p>
<p className="text-sm text-gray-500">Secondary text</p>`}
          >
            Don&apos;t use raw size + weight classes — they miss line height and
            letter spacing.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Use semantic text colors'
          description={
            <>
              Semantic colors like <Code>text-subtle</Code> adapt to intents,
              themes, and dark mode. Raw color classes break with context
              changes.
            </>
          }
        >
          <Guideline.Do
            example={
              <div className='grid gap-1'>
                <p className='text-strong'>Strong text</p>
                <p className='text-normal'>Default text</p>
                <p className='text-subtle'>Subtle text</p>
                <p className='text-subtler'>Subtler text</p>
              </div>
            }
            code={`<p className="text-strong">Strong text</p>
<p className="text-normal">Default text</p>
<p className="text-subtle">Subtle text</p>
<p className="text-subtler">Subtler text</p>`}
          >
            Semantic colors adapt to the current intent and theme automatically.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='grid gap-1'>
                <p className='text-gray-900 font-bold'>Bold gray 900</p>
                <p className='text-gray-700'>Gray 700</p>
                <p className='text-gray-500'>Gray 500</p>
                <p className='text-gray-400'>Gray 400</p>
              </div>
            }
            code={`<p className="font-bold text-gray-900">Bold gray 900</p>
<p className="text-gray-700">Gray 700</p>
<p className="text-gray-500">Gray 500</p>
<p className="text-gray-400">Gray 400</p>`}
          >
            Don&apos;t hardcode color values — they won&apos;t respond to intent
            or dark mode.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Match context to content type'
          description={
            <>
              UI styles are compact for app interfaces. Prose styles are larger
              for long-form reading. Mixing them creates visual inconsistency.
            </>
          }
        >
          <Guideline.Do
            example={
              <div className='grid gap-2'>
                <p className='text-xs text-subtler'>Dashboard</p>
                <h3 className='text-display-ui-4 text-strong'>Recent orders</h3>
                <p className='text-sm text-subtle'>
                  3 orders in the last 24 hours
                </p>
              </div>
            }
            code={`<h3 className="text-display-ui-4 text-strong">Recent orders</h3>
<p className="text-sm text-subtle">3 orders in the last 24 hours</p>`}
          >
            UI headings for dashboards, prose headings for articles.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <div className='grid gap-2'>
                <p className='text-xs text-subtler'>Dashboard</p>
                <h3 className='text-display-prose-4 text-strong'>
                  Recent orders
                </h3>
                <p className='text-sm text-subtle'>
                  3 orders in the last 24 hours
                </p>
              </div>
            }
            code={`<h3 className="text-display-prose-4 text-strong">Recent orders</h3>
<p className="text-sm text-subtle">3 orders in the last 24 hours</p>`}
          >
            Don&apos;t use prose display styles in app UI — they&apos;re too
            large and heavy.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Use semantic HTML elements'
          description={
            <>
              Use the right element for the content type. Heading elements
              establish document structure for accessibility and SEO.
            </>
          }
        >
          <Guideline.Do
            code={`<h2 className="text-display-ui-3 text-strong">
  Section title
</h2>
<p className="text-subtle">
  Description text
</p>`}
          >
            Use headings for headings, paragraphs for text, spans for inline
            fragments.
          </Guideline.Do>
          <Guideline.Dont
            code={`<div className="text-display-ui-3 text-strong">
  Section title
</div>
<div className="text-subtle">
  Description text
</div>`}
          >
            Don&apos;t use divs for text content — screen readers can&apos;t
            identify the structure.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Let fluid type handle responsiveness'
          description={
            <>
              Text style utilities already use <Code>clamp()</Code> for fluid
              scaling. Adding breakpoint overrides for font size fights the
              system.
            </>
          }
        >
          <Guideline.Do
            code={`{/* Automatically fluid */}
<h1 className="text-display-ui-1 text-strong">
  Dashboard
</h1>`}
          >
            Fluid type scales smoothly across all viewport widths.
          </Guideline.Do>
          <Guideline.Dont
            code={`{/* Fighting the fluid scale */}
<h1 className="text-xl md:text-2xl lg:text-4xl">
  Dashboard
</h1>`}
          >
            Don&apos;t add manual breakpoints for font size — it creates jarring
            jumps.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Maintain heading hierarchy'
          description={
            <>
              Heading levels should follow document structure (h1 &rarr; h2
              &rarr; h3). Visual weight is controlled by the display utility,
              not the heading level.
            </>
          }
        >
          <Guideline.Do
            code={`<h1 className="text-display-ui-1 ...">Page</h1>
<h2 className="text-display-ui-3 ...">Section</h2>
<h3 className="text-display-ui-5 ...">Sub</h3>`}
          >
            Semantic levels follow structure. Visual style is independent.
          </Guideline.Do>
          <Guideline.Dont
            code={`<h1 className="text-display-ui-1 ...">Page</h1>
{/* Skipped h2! */}
<h4 className="text-display-ui-5 ...">Sub</h4>`}
          >
            Don&apos;t skip heading levels for visual effect.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Use Prose for rich content'
          description={
            <>
              The <Code>&lt;Prose&gt;</Code> component styles nested HTML for
              CMS output, markdown, or user-generated content. It handles
              spacing, list markers, and element typography.
            </>
          }
        >
          <Guideline.Do
            code={`<Prose>
  <h2>Title</h2>
  <p>Paragraph with <a href="#">link</a></p>
  <ul><li>Item</li></ul>
</Prose>`}
          >
            Prose handles all child element styling automatically.
          </Guideline.Do>
          <Guideline.Dont
            code={`<div>
  <h2 className="text-2xl mb-4">Title</h2>
  <p className="mb-2 leading-6">Text</p>
  <ul className="list-disc pl-4">...</ul>
</div>`}
          >
            Don&apos;t manually style every element in user content.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* Semantic elements guide */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Semantic elements guide
        </h2>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle'>
                <th className='py-2 pr-4 text-left font-semibold'>Element</th>
                <th className='py-2 pr-4 text-left font-semibold'>
                  When to use
                </th>
                <th className='py-2 text-left font-semibold'>Example</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>
                  &lt;h1&gt;-&lt;h6&gt;
                </td>
                <td className='py-2 pr-4'>Section headings</td>
                <td className='py-2 font-mono text-xs'>
                  text-display-ui-3 text-strong
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>&lt;p&gt;</td>
                <td className='py-2 pr-4'>Body text, descriptions</td>
                <td className='py-2 font-mono text-xs'>text-subtle</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>&lt;span&gt;</td>
                <td className='py-2 pr-4'>Inline text fragments</td>
                <td className='py-2 font-mono text-xs'>text-sm text-subtler</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>&lt;strong&gt;</td>
                <td className='py-2 pr-4'>Important text</td>
                <td className='py-2 font-mono text-xs'>text-strong</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>&lt;em&gt;</td>
                <td className='py-2 pr-4'>Emphasis / stress</td>
                <td className='py-2 font-mono text-xs'>(italic by default)</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>&lt;Code&gt;</td>
                <td className='py-2 pr-4'>Inline code, tokens, commands</td>
                <td className='py-2 font-mono text-xs'>
                  &lt;Code&gt;bg-normal&lt;/Code&gt;
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>&lt;Prose&gt;</td>
                <td className='py-2 pr-4'>CMS / markdown content</td>
                <td className='py-2 font-mono text-xs'>
                  &lt;Prose size=&quot;md&quot;&gt;...&lt;/Prose&gt;
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
