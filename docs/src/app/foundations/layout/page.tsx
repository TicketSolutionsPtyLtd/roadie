import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Layout',
  description:
    'Layout principles, spacing scale, and best practices for building resilient layouts.'
}

const spacingScale = [
  { token: '0', value: '0px', rem: '0rem' },
  { token: '0.5', value: '2px', rem: '0.125rem' },
  { token: '1', value: '4px', rem: '0.25rem' },
  { token: '1.5', value: '6px', rem: '0.375rem' },
  { token: '2', value: '8px', rem: '0.5rem' },
  { token: '3', value: '12px', rem: '0.75rem' },
  { token: '4', value: '16px', rem: '1rem' },
  { token: '5', value: '20px', rem: '1.25rem' },
  { token: '6', value: '24px', rem: '1.5rem' },
  { token: '8', value: '32px', rem: '2rem' },
  { token: '10', value: '40px', rem: '2.5rem' },
  { token: '12', value: '48px', rem: '3rem' },
  { token: '16', value: '64px', rem: '4rem' },
  { token: '20', value: '80px', rem: '5rem' },
  { token: '24', value: '96px', rem: '6rem' }
]

export default function LayoutPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Layout</h1>
        <p className='text-lg text-subtle'>
          Default to Grid. Use gap, not margin. Set constraints, not fixed
          dimensions. Let the browser do the work.
        </p>
      </div>

      {/* Grid vs Flexbox */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Grid vs Flexbox</h2>
        <p className='text-subtle'>
          The 1D vs 2D framing is a false distinction. The real question is{' '}
          <strong className='text-strong'>who controls sizing</strong>.
        </p>
        <div className='grid sm:grid-cols-2 gap-4'>
          <div className='emphasis-raised rounded-lg p-6 grid gap-3'>
            <h3 className='text-display-ui-5 text-strong'>
              Grid = parent controls
            </h3>
            <p className='text-subtle text-sm'>
              The container defines tracks and places content inside them.
              Columns are consistent regardless of content variation. Default
              for most layouts — including vertical stacks.
            </p>
            <div className='grid gap-1'>
              <Code>grid gap-4</Code>
              <Code>grid grid-cols-3 gap-4</Code>
              <Code>grid place-content-center</Code>
            </div>
          </div>
          <div className='emphasis-raised rounded-lg p-6 grid gap-3'>
            <h3 className='text-display-ui-5 text-strong'>
              Flex = children control
            </h3>
            <p className='text-subtle text-sm'>
              Items negotiate their own sizes based on content. Ideal when
              layout should follow content — tags, nav items, pill lists,
              wrapping rows where items should be as wide as they need to be.
            </p>
            <div className='grid gap-1'>
              <Code>flex gap-4 items-center</Code>
              <Code>flex flex-wrap gap-2</Code>
            </div>
          </div>
        </div>
      </section>

      {/* Layout patterns */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Patterns</h2>

        <div className='grid gap-8'>
          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Vertical stack</h3>
            <p className='text-sm text-subtle'>
              <Code>grid gap-4</Code> — the default vertical layout.
            </p>
            <div className='emphasis-subtle rounded-lg p-4'>
              <div className='grid gap-4'>
                <div className='bg-raised rounded p-3 text-sm'>Item 1</div>
                <div className='bg-raised rounded p-3 text-sm'>Item 2</div>
                <div className='bg-raised rounded p-3 text-sm'>Item 3</div>
              </div>
            </div>
          </div>

          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Centered content</h3>
            <p className='text-sm text-subtle'>
              <Code>grid place-content-center</Code> — one class centers both
              axes.
            </p>
            <div className='emphasis-subtle rounded-lg p-4'>
              <div className='grid place-content-center min-h-[160px]'>
                <p className='text-sm text-subtle'>Centered in both axes</p>
              </div>
            </div>
          </div>

          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Horizontal row</h3>
            <p className='text-sm text-subtle'>
              <Code>flex gap-4 items-center</Code> — content-driven sizing.
            </p>
            <div className='emphasis-subtle rounded-lg p-4'>
              <div className='flex gap-4 items-center'>
                <div className='bg-raised rounded px-3 py-1.5 text-sm'>Tag</div>
                <div className='bg-raised rounded px-3 py-1.5 text-sm'>
                  Another tag
                </div>
                <div className='bg-raised rounded px-3 py-1.5 text-sm'>
                  Longer tag here
                </div>
              </div>
            </div>
          </div>

          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Equal columns</h3>
            <p className='text-sm text-subtle'>
              <Code>grid grid-cols-3 gap-4</Code> — parent controls column
              widths.
            </p>
            <div className='emphasis-subtle rounded-lg p-4'>
              <div className='grid grid-cols-3 gap-4'>
                <div className='bg-raised rounded p-3 text-sm'>Column 1</div>
                <div className='bg-raised rounded p-3 text-sm'>
                  Column 2 with more content
                </div>
                <div className='bg-raised rounded p-3 text-sm'>Column 3</div>
              </div>
            </div>
          </div>

          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Responsive grid</h3>
            <p className='text-sm text-subtle'>
              <Code>grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6</Code>
            </p>
            <div className='emphasis-subtle rounded-lg p-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className='bg-raised rounded p-3 text-sm'>
                    Item {n}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Asymmetric layout</h3>
            <p className='text-sm text-subtle'>
              <Code>{'grid grid-cols-[1fr_2fr] gap-6'}</Code>
            </p>
            <div className='emphasis-subtle rounded-lg p-4'>
              <div className='grid grid-cols-[1fr_2fr] gap-6'>
                <div className='bg-raised rounded p-3 text-sm'>
                  Sidebar (1fr)
                </div>
                <div className='bg-raised rounded p-3 text-sm'>
                  Main content (2fr)
                </div>
              </div>
            </div>
          </div>
          <div className='grid gap-2'>
            <h3 className='text-display-ui-5 text-strong'>Wrapping row</h3>
            <p className='text-sm text-subtle'>
              <Code>flex flex-wrap gap-2</Code> — items wrap naturally based on
              content width. This is where Flexbox shines: children control
              their own size.
            </p>
            <div className='emphasis-subtle rounded-lg p-4'>
              <div className='flex flex-wrap gap-2'>
                {[
                  'Design',
                  'Tokens',
                  'Tailwind',
                  'CSS',
                  'Grid',
                  'Flexbox',
                  'Layout',
                  'Spacing',
                  'Typography',
                  'Color',
                  'Elevation'
                ].map((tag) => (
                  <span
                    key={tag}
                    className='emphasis-subtle rounded-full px-3 py-1 text-sm'
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sizing */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Sizing</h2>
        <p className='text-subtle'>
          Set constraints, not fixed dimensions. Let content breathe and the
          layout flex.
        </p>

        <div className='grid gap-4'>
          <div className='grid sm:grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <h3 className='text-display-ui-6 text-strong'>
                Constraints over fixed
              </h3>
              <p className='text-sm text-subtle'>
                Use <Code>min-h-</Code> / <Code>max-w-</Code> instead of{' '}
                <Code>h-</Code> / <Code>w-</Code>. Fixed dimensions clip
                content. Constraints let it grow.
              </p>
            </div>
            <div className='grid gap-2'>
              <h3 className='text-display-ui-6 text-strong'>
                Trust browser defaults
              </h3>
              <p className='text-sm text-subtle'>
                Block elements default to <Code>width: auto</Code> which
                accounts for margins and padding. Don&apos;t set{' '}
                <Code>w-full</Code> or <Code>w-screen</Code> unless you have a
                concrete reason.
              </p>
            </div>
          </div>

          <div className='grid sm:grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <h3 className='text-display-ui-6 text-strong'>fit-content</h3>
              <p className='text-sm text-subtle'>
                <Code>w-fit</Code> sizes an element to its content. Useful for
                buttons, badges, and inline elements that shouldn&apos;t
                stretch.
              </p>
              <div className='emphasis-subtle rounded-lg p-4'>
                <div className='w-fit emphasis-strong rounded-full px-4 py-2 text-sm'>
                  I&apos;m only as wide as my content
                </div>
              </div>
            </div>
            <div className='grid gap-2'>
              <h3 className='text-display-ui-6 text-strong'>fr and minmax()</h3>
              <p className='text-sm text-subtle'>
                Use <Code>fr</Code> units in grid templates to distribute
                available space. Use <Code>minmax(0, 1fr)</Code> to prevent
                content from forcing columns wider than intended.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Container queries */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Container queries</h2>
        <p className='text-subtle'>
          Components should respond to their parent, not the viewport. A card in
          a narrow sidebar needs different styling than the same card in a wide
          main column — but the viewport width is the same. Use{' '}
          <Code>@container</Code> for component-level adaptation.
        </p>

        <div className='grid gap-4'>
          <div className='grid sm:grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <h3 className='text-display-ui-6 intent-danger text-subtle'>
                Don&apos;t — media query
              </h3>
              <div className='emphasis-sunken rounded-lg overflow-x-auto min-w-0'>
                <pre className='text-xs font-mono text-subtle p-4 min-w-0'>
                  {`{/* Responds to viewport — breaks in narrow columns */}
<div className="grid md:grid-cols-[auto_1fr]">
  <img />
  <div>Content</div>
</div>`}
                </pre>
              </div>
            </div>
            <div className='grid gap-2'>
              <h3 className='text-display-ui-6 intent-success text-subtle'>
                Do — container query
              </h3>
              <div className='emphasis-sunken rounded-lg overflow-x-auto min-w-0'>
                <pre className='text-xs font-mono text-subtle p-4 min-w-0'>
                  {`{/* Responds to parent width */}
<div className="@container">
  <div className="grid @sm:grid-cols-[auto_1fr]">
    <img />
    <div>Content</div>
  </div>
</div>`}
                </pre>
              </div>
            </div>
          </div>

          <p className='text-sm text-subtle'>
            Tailwind&apos;s <Code>@container</Code> class sets{' '}
            <Code>container-type: inline-size</Code>. Then use <Code>@sm:</Code>
            , <Code>@md:</Code>, <Code>@lg:</Code> etc. as container-query
            variants instead of <Code>sm:</Code>, <Code>md:</Code>.
          </p>

          <div className='grid gap-2'>
            <h3 className='text-display-ui-6 text-strong'>
              Live example — resize the columns
            </h3>
            <div className='grid sm:grid-cols-2 gap-4'>
              <div className='@container'>
                <div className='grid @sm:grid-cols-[80px_1fr] gap-3 bg-raised rounded-lg p-4'>
                  <div className='bg-subtle rounded aspect-square' />
                  <div className='grid gap-1'>
                    <p className='text-sm text-strong'>Narrow container</p>
                    <p className='text-xs text-subtle'>
                      Card stacks vertically until container is wide enough
                    </p>
                  </div>
                </div>
              </div>
              <div className='@container sm:col-span-1'>
                <div className='grid @sm:grid-cols-[80px_1fr] gap-3 bg-raised rounded-lg p-4'>
                  <div className='bg-subtle rounded aspect-square' />
                  <div className='grid gap-1'>
                    <p className='text-sm text-strong'>Wider container</p>
                    <p className='text-xs text-subtle'>
                      Same component, adapts to available space
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className='text-sm text-subtle'>
            Media queries for page-level layout. Container queries for
            component-level adaptation. Use both.
          </p>
        </div>
      </section>

      {/* Spacing scale */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Spacing scale</h2>
        <p className='text-subtle'>
          Based on a 4px unit. Use with <Code>gap-</Code>, <Code>p-</Code>,{' '}
          <Code>m-</Code>, <Code>w-</Code>, <Code>h-</Code>.
        </p>

        <div className='grid gap-1 bg-subtle border border-subtle rounded-lg p-4 overflow-x-auto'>
          {spacingScale.map(({ token, value, rem }) => (
            <div key={token} className='flex items-center gap-3'>
              <p className='w-10 shrink-0 text-right tabular-nums text-sm text-strong'>
                {token}
              </p>
              <div
                className='h-6 rounded-sm bg-strong intent-brand shrink-0'
                style={{ width: rem }}
              />
              <p className='text-xs text-subtler shrink-0'>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Best practices */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Best practices</h2>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle'>
                <th className='py-2 pr-4 text-left font-semibold'>Do</th>
                <th className='py-2 pr-4 text-left font-semibold'>
                  Don&apos;t
                </th>
                <th className='py-2 text-left font-semibold'>Why</th>
              </tr>
            </thead>
            <tbody className='text-subtle divide-y divide-subtler'>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>gap-4</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  mb-4 on children
                </td>
                <td className='py-2'>Gap never creates edge spacing</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>grid gap-4</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  flex flex-col gap-4
                </td>
                <td className='py-2'>Grid is simpler for vertical stacks</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>
                  grid place-content-center
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  flex items-center justify-center
                </td>
                <td className='py-2'>One class centers both axes</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>
                  grid grid-cols-3
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  flex with calc(33%)
                </td>
                <td className='py-2'>Grid handles equal columns natively</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>min-h-[200px]</td>
                <td className='py-2 pr-4 font-mono text-xs'>h-[200px]</td>
                <td className='py-2'>Content can grow beyond fixed height</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>max-w-4xl</td>
                <td className='py-2 pr-4 font-mono text-xs'>w-full</td>
                <td className='py-2'>Caps width, stays responsive</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 font-mono text-xs'>minmax(0, 1fr)</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  300px fixed columns
                </td>
                <td className='py-2'>
                  Fixed units cause overflow on small screens
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
