import Link from 'next/link'

import { Guideline } from '@/components/Guideline'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Motion',
  description:
    'Duration, easing, and animation tokens for purposeful, accessible motion.'
}

const durationTokens = [
  {
    token: '--duration-instant',
    value: '0ms',
    tier: 'Micro',
    use: 'Immediate state changes, no visible transition'
  },
  {
    token: '--duration-fastest',
    value: '50ms',
    tier: 'Micro',
    use: 'Opacity flashes, active press feedback'
  },
  {
    token: '--duration-fast',
    value: '100ms',
    tier: 'Micro',
    use: 'Tooltips, focus rings, subtle hover shifts'
  },
  {
    token: '--duration-normal',
    value: '150ms',
    tier: 'Micro',
    use: 'Button hover, icon rotation, small transforms'
  },
  {
    token: '--duration-moderate',
    value: '200ms',
    tier: 'Component',
    use: 'Color transitions, border changes, emphasis shifts'
  },
  {
    token: '--duration-slow',
    value: '300ms',
    tier: 'Component',
    use: 'Accordion expand, dropdown open, card flip'
  },
  {
    token: '--duration-slower',
    value: '400ms',
    tier: 'Page',
    use: 'Modal enter, panel slide, route transition'
  },
  {
    token: '--duration-slowest',
    value: '600ms',
    tier: 'Page',
    use: 'Full-page transitions, complex orchestrations'
  }
]

const easingTokens = [
  {
    token: '--ease-standard',
    value: 'cubic-bezier(0.4, 0, 0.2, 1)',
    use: 'Default for color, opacity, box-shadow transitions',
    property: 'Color & opacity'
  },
  {
    token: '--ease-enter',
    value: 'cubic-bezier(0, 0, 0.2, 1)',
    use: 'Elements entering — starts fast, settles gently',
    property: 'Entrances'
  },
  {
    token: '--ease-exit',
    value: 'cubic-bezier(0.4, 0, 1, 1)',
    use: 'Elements leaving — starts slow, accelerates out',
    property: 'Exits'
  },
  {
    token: '--ease-spring',
    value: 'linear(...)',
    use: 'Transforms only — slight overshoot for physical feel',
    property: 'Transforms'
  }
]

const animationUtilities = [
  {
    name: 'motion-fade-in',
    description: 'Fade in from transparent',
    use: 'motion-fade-in'
  },
  {
    name: 'motion-fade-out',
    description: 'Fade out to transparent',
    use: 'motion-fade-out'
  },
  {
    name: 'motion-scale-in',
    description: 'Scale up from 95% with fade — popups, dropdowns',
    use: 'motion-scale-in'
  },
  {
    name: 'motion-scale-out',
    description: 'Scale down to 95% with fade — popup dismiss',
    use: 'motion-scale-out'
  }
]

const brandValues = [
  {
    name: 'Responsive',
    description:
      'Motion reacts instantly to input. Like a crew backstage \u2014 things happen when they should.'
  },
  {
    name: 'Grounded',
    description:
      'Elements feel like they have weight. Things land where they belong, with just enough give to feel real.'
  },
  {
    name: 'Efficient',
    description:
      'Every animation earns its place. If it doesn\u2019t orient, direct, or confirm \u2014 cut it.'
  }
]

export default function MotionPage() {
  return (
    <div className='grid gap-12'>
      {/* ── Hero ── */}
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Motion</h1>
        <p className='text-lg text-subtle'>
          Motion is feedback. Every transition tells the user what happened,
          what&apos;s happening, or where to look. If it doesn&apos;t do one of
          those jobs, cut it.
        </p>
      </div>

      {/* ── Brand personality ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>The Oztix feel</h2>
        <p className='text-subtle'>
          Three principles that define how Oztix products move. Every animation
          decision should trace back to one of these.
        </p>

        <div className='grid gap-4 sm:grid-cols-3'>
          {brandValues.map(({ name, description }) => (
            <div
              key={name}
              className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'
            >
              <h3 className='text-display-ui-5 text-strong'>{name}</h3>
              <p className='text-sm text-subtle'>{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Duration tokens ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Timing</h2>
        <p className='text-subtle'>
          Duration scales with distance and size. A toggle switch moves fast. A
          modal needs more time. Match duration to the physical scale of the
          element.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Token</th>
                <th className='py-2 pr-4 font-semibold'>Value</th>
                <th className='py-2 pr-4 font-semibold'>Tier</th>
                <th className='py-2 font-semibold'>When to use</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              {durationTokens.map(({ token, value, tier, use }) => (
                <tr key={token}>
                  <td className='py-2 pr-4 text-strong'>
                    <Code>{token}</Code>
                  </td>
                  <td className='py-2 pr-4 font-mono'>{value}</td>
                  <td className='py-2 pr-4'>{tier}</td>
                  <td className='py-2'>{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='rounded-xl emphasis-subtle p-4'>
          <p className='text-sm text-subtle'>
            <strong className='text-strong'>Rule of thumb:</strong>{' '}
            50&ndash;150ms for micro-interactions (hover, focus, press).
            200&ndash;300ms for component transitions (accordion, dropdown).
            400&ndash;600ms for page transitions (modal, route change).
          </p>
        </div>

        {/* Duration demo */}
        <div className='grid gap-2'>
          <p className='text-sm text-strong'>
            Duration comparison &mdash; hover each to see the speed
          </p>
          <div className='grid gap-3 rounded-xl emphasis-subtle p-6 sm:grid-cols-4'>
            {[
              { label: 'Fast', className: 'duration-fast' },
              { label: 'Normal', className: 'duration-normal' },
              { label: 'Moderate', className: 'duration-moderate' },
              { label: 'Slow', className: 'duration-slow' }
            ].map(({ label, className }) => (
              <div
                key={label}
                className={`grid emphasis-raised place-content-center rounded-lg p-4 text-center transition-[background-color,translate] ${className} hover:-translate-y-1 hover:bg-subtle`}
              >
                <p className='text-sm font-bold text-strong'>{label}</p>
                <p className='text-xs text-subtler'>{className}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Easing tokens ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Feel</h2>
        <p className='text-subtle'>
          Easing defines the character of motion. Standard curves for color and
          opacity. Spring physics for transforms &mdash; the overshoot gives
          elements physical weight.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Token</th>
                <th className='py-2 pr-4 font-semibold'>Curve</th>
                <th className='py-2 font-semibold'>When to use</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              {easingTokens.map(({ token, value, use }) => (
                <tr key={token}>
                  <td className='py-2 pr-4 text-strong'>
                    <Code>{token}</Code>
                  </td>
                  <td className='py-2 pr-4 font-mono text-xs'>{value}</td>
                  <td className='py-2'>{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Easing demo */}
        <div className='grid gap-2'>
          <p className='text-sm text-strong'>
            Easing comparison &mdash; hover to see each curve in action
          </p>
          <div className='grid gap-3 rounded-xl emphasis-subtle p-6 sm:grid-cols-2'>
            {[
              {
                label: 'Standard',
                token: 'ease-standard',
                desc: 'Symmetric — color & opacity',
                className: 'ease-standard'
              },
              {
                label: 'Enter',
                token: 'ease-enter',
                desc: 'Decelerating — elements arriving',
                className: 'ease-enter'
              },
              {
                label: 'Exit',
                token: 'ease-exit',
                desc: 'Accelerating — elements leaving',
                className: 'ease-exit'
              },
              {
                label: 'Spring',
                token: 'ease-spring',
                desc: 'Overshoot — transforms only',
                className: 'ease-spring'
              }
            ].map(({ label, token, desc, className }) => (
              <div
                key={label}
                className={`duration-slow grid emphasis-raised place-content-center rounded-lg p-4 text-center transition-[translate] ${className} hover:-translate-y-2`}
              >
                <p className='text-sm font-bold text-strong'>{label}</p>
                <p className='font-mono text-xs text-subtler'>{token}</p>
                <p className='mt-1 text-xs text-subtle'>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-xl emphasis-subtle p-4'>
          <p className='text-sm text-subtle'>
            <strong className='text-strong'>Key rule:</strong> Use{' '}
            <Code>--ease-spring</Code> for <Code>transform</Code> properties
            (scale, translate, rotate). Use <Code>--ease-standard</Code> for{' '}
            <Code>background-color</Code>, <Code>opacity</Code>, and{' '}
            <Code>box-shadow</Code>. Spring physics on color changes has no
            physical analogue &mdash; it just looks wrong.
          </p>
        </div>
      </section>

      {/* ── Animation utilities ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>The toolkit</h2>
        <p className='text-subtle'>
          Pre-built animation utilities for common patterns. These compose with
          Tailwind&apos;s <Code>motion-safe:</Code> and{' '}
          <Code>motion-reduce:</Code> variants and are automatically neutralised
          by the global reduced motion reset.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Utility</th>
                <th className='py-2 pr-4 font-semibold'>What it does</th>
                <th className='py-2 font-semibold'>Usage</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              {animationUtilities.map(({ name, description, use }) => (
                <tr key={name}>
                  <td className='py-2 pr-4 text-strong'>
                    <Code>{name}</Code>
                  </td>
                  <td className='py-2 pr-4'>{description}</td>
                  <td className='py-2 font-mono text-xs'>{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Motion across the system ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>
          Motion across the system
        </h2>
        <p className='text-subtle'>
          Motion tokens don&apos;t live in isolation &mdash; they&apos;re wired
          into every interactive foundation. Here&apos;s where they connect.
        </p>

        <div className='grid gap-4 sm:grid-cols-2'>
          <Link
            href='/foundations/interactions'
            className='duration-moderate grid emphasis-raised content-start gap-2 rounded-xl p-5 transition-[translate,box-shadow] hover:-translate-y-0.5 hover:shadow-lg'
          >
            <h3 className='text-display-ui-5 text-strong'>Interactions</h3>
            <p className='text-sm text-subtle'>
              <Code>is-interactive</Code> and <Code>is-field-interactive</Code>{' '}
              embed motion tokens directly. Button hover uses{' '}
              <Code>duration-moderate</Code> + <Code>ease-standard</Code>.
              Active press uses <Code>duration-normal</Code> +{' '}
              <Code>ease-spring</Code>. Field focus transitions use{' '}
              <Code>ease-enter</Code>.
            </p>
          </Link>
          <Link
            href='/foundations/elevation'
            className='duration-moderate grid emphasis-raised content-start gap-2 rounded-xl p-5 transition-[translate,box-shadow] hover:-translate-y-0.5 hover:shadow-lg'
          >
            <h3 className='text-display-ui-5 text-strong'>Elevation</h3>
            <p className='text-sm text-subtle'>
              Shadow transitions on hover states are driven by motion tokens.
              When <Code>emphasis-raised</Code> lifts on hover, the shadow
              scales from <Code>shadow-md</Code> to <Code>shadow-lg</Code> using{' '}
              <Code>duration-moderate</Code>. Intent-tinted shadows shift color
              with the same easing.
            </p>
          </Link>
          <Link
            href='/foundations/shape'
            className='duration-moderate grid emphasis-raised content-start gap-2 rounded-xl p-5 transition-[translate,box-shadow] hover:-translate-y-0.5 hover:shadow-lg'
          >
            <h3 className='text-display-ui-5 text-strong'>Shape</h3>
            <p className='text-sm text-subtle'>
              Border-radius tiers affect how motion is perceived. Popups use{' '}
              <Code>rounded-xl</Code> and scale from{' '}
              <Code>transform-origin: var(--transform-origin)</Code> so they
              expand from their anchor. The radius ensures the scale animation
              reads as a smooth reveal, not a sharp resize.
            </p>
          </Link>
          <Link
            href='/foundations/colors'
            className='duration-moderate grid emphasis-raised content-start gap-2 rounded-xl p-5 transition-[translate,box-shadow] hover:-translate-y-0.5 hover:shadow-lg'
          >
            <h3 className='text-display-ui-5 text-strong'>Colors</h3>
            <p className='text-sm text-subtle'>
              Motion inherits color context via the intent cascade. A button
              inside <Code>intent-danger</Code> transitions to danger hover
              colors using the same tokens. Focus rings shift to the
              intent&apos;s accent color &mdash; the timing stays consistent.
            </p>
          </Link>
        </div>
      </section>

      {/* ── Reduced motion ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Everyone gets in</h2>
        <p className='text-subtle'>
          Motion causes nausea for some users. This is a health issue, not a
          preference. Roadie includes a global{' '}
          <Code>prefers-reduced-motion</Code> reset that neutralises all
          transitions and animations automatically.
        </p>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>What it does</h3>
            <p className='text-sm text-subtle'>
              Sets all <Code>animation-duration</Code> and{' '}
              <Code>transition-duration</Code> to <Code>0.01ms</Code> globally.
              Uses <Code>0.01ms</Code> instead of <Code>0ms</Code> so JavaScript
              transition and animation events still fire correctly.
            </p>
          </div>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>How to test</h3>
            <p className='text-sm text-subtle'>
              In Chrome DevTools, open the Rendering tab and set &ldquo;Emulate
              CSS media feature prefers-reduced-motion&rdquo; to
              &ldquo;reduce&rdquo;. On macOS, go to System Settings &gt;
              Accessibility &gt; Display &gt; Reduce motion.
            </p>
          </div>
        </div>

        <div className='rounded-xl emphasis-subtle p-4'>
          <p className='text-sm text-subtle'>
            <strong className='text-strong'>Note:</strong> Tailwind&apos;s{' '}
            <Code>motion-safe:</Code> and <Code>motion-reduce:</Code> variants
            are still available for cases where you want to swap a motion for a
            static alternative rather than simply disabling it.
          </p>
        </div>
      </section>

      {/* ── Guidelines ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Guidelines</h2>
        <p className='text-subtle'>
          Rules for how motion should work across Oztix applications. Follow
          these when building custom animated UI.
        </p>

        <Guideline
          title='Give every animation a job'
          description='Motion communicates cause and effect. If an animation doesn&rsquo;t orient, direct focus, give feedback, or show a state change &mdash; cut it.'
        >
          <Guideline.Do
            example={
              <button
                type='button'
                className='is-interactive emphasis-strong rounded-full px-5 py-2.5 text-sm font-bold'
              >
                Click me
              </button>
            }
          >
            A button press scales down to confirm the click landed. A select
            popup scaling in from its trigger shows what opened it. Each
            transition has a job &mdash; feedback, orientation, or state change.
          </Guideline.Do>
          <Guideline.Dont
            example={
              <p className='animate-bounce text-sm font-bold text-strong'>
                Look at me!
              </p>
            }
          >
            A heading bounces on page load because someone thought it looked
            fun. Random animations on static content rarely communicate anything
            meaningful.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Be specific about what moves'
          description='Precision prevents side effects. List exactly which properties transition.'
        >
          <Guideline.Do
            code={`/* Explicit and safe */
transition:
  background-color var(--duration-moderate) var(--ease-standard),
  transform var(--duration-normal) var(--ease-spring);`}
          >
            List exact transition properties. Roadie&apos;s{' '}
            <Code>is-interactive</Code> handles this automatically for standard
            interactive elements.
          </Guideline.Do>
          <Guideline.Dont
            code={`/* Animates everything, including layout */
transition: all 150ms ease-out;`}
          >
            Use <Code>transition-all</Code> &mdash; it&apos;ll animate padding,
            font-size, and anything else that changes, causing layout
            recalculations on every frame.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Honour the user&rsquo;s preferences'
          description='Reduced motion is a health accommodation, not a design preference.'
        >
          <Guideline.Do
            code={`/* Roadie's global reset — automatic */
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; }
}`}
          >
            The global <Code>prefers-reduced-motion</Code> reset handles this
            automatically. Test with it enabled in DevTools before shipping.
          </Guideline.Do>
          <Guideline.Dont>
            Ship animations without checking. Force parallax effects on users
            who have explicitly asked to minimise motion. Vestibular disorders
            make this a health issue.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Use tokens, not magic numbers'
          description='Tokens keep motion consistent as the system grows. Hardcoded values drift.'
        >
          <Guideline.Do
            code={`transition:
  background-color var(--duration-moderate) var(--ease-standard);`}
          >
            Use duration and easing tokens. One change updates every component.
          </Guideline.Do>
          <Guideline.Dont
            code={`transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);`}
          >
            Hardcode <Code>0.2s cubic-bezier(0.4, 0, 0.2, 1)</Code> across 15
            files &mdash; one typo and things feel off.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Springs for transforms, easing for color'
          description='Spring physics create a sense of mass and momentum. That metaphor only works for spatial motion.'
        >
          <Guideline.Do
            example={
              <div className='grid gap-2 sm:grid-cols-2'>
                <div className='duration-moderate grid emphasis-raised place-content-center rounded-lg p-4 transition-transform ease-spring hover:scale-105'>
                  <p className='text-xs font-bold text-strong'>
                    Spring on transform
                  </p>
                </div>
                <div className='duration-moderate grid emphasis-raised place-content-center rounded-lg p-4 transition-[background-color] ease-standard hover:bg-subtle'>
                  <p className='text-xs font-bold text-strong'>
                    Standard on color
                  </p>
                </div>
              </div>
            }
          >
            Use <Code>ease-spring</Code> for <Code>transform</Code> transitions
            &mdash; the slight overshoot gives elements physical weight. Use{' '}
            <Code>ease-standard</Code> for <Code>background-color</Code> and{' '}
            <Code>opacity</Code>.
          </Guideline.Do>
          <Guideline.Dont>
            Apply spring easing to <Code>opacity</Code> or <Code>color</Code>{' '}
            &mdash; there&apos;s no physical analogue to spring tension on a
            colour change. It adds overhead with no perceptual benefit.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Never block the interface'
          description='Users are faster than animations. Never lock the UI behind a transition.'
        >
          <Guideline.Do>
            Ensure animations can be cancelled or reversed immediately. A user
            clicking &ldquo;Close&rdquo; on an opening modal should trigger the
            close animation at once. Use CSS transitions (interruptible) over
            keyframe animations (fire-and-forget) where possible.
          </Guideline.Do>
          <Guideline.Dont>
            Force the user to watch a 2-second success animation before they can
            click &ldquo;Next&rdquo;. Delightful once, infuriating on the 50th
            use.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Things grow from where they are'
          description='Physics requires a pivot. Elements should expand from their anchor point.'
        >
          <Guideline.Do
            code={`/* Dropdown scales from its trigger */
.popup {
  transform-origin: var(--transform-origin);
  transition: transform var(--duration-normal) var(--ease-spring);
}`}
          >
            A dropdown menu scales from its trigger button. A modal expands from
            the button that opened it. Roadie&apos;s Select and Combobox popups
            handle this automatically via Base UI&apos;s{' '}
            <Code>--transform-origin</Code>.
          </Guideline.Do>
          <Guideline.Dont>
            Scale a popup from the centre of the screen when it was triggered
            from a button in the bottom-right corner &mdash; this breaks the
            spatial illusion.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Stagger, don&rsquo;t flood'
          description='Choreography creates hierarchy. Stagger related elements to guide the eye.'
        >
          <Guideline.Do
            code={`/* Stagger items using the token */
.item { animation-delay: calc(var(--stagger-base) * var(--i)); }`}
          >
            When a list of items enters the screen, stagger each item by
            30&ndash;50ms (<Code>--stagger-base</Code>) so the eye is led
            through the sequence rather than overwhelmed.
          </Guideline.Do>
          <Guideline.Dont>
            Animate all 12 cards in a grid simultaneously &mdash; the result is
            a flash, not a reveal.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── Quick reference ── */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Quick reference</h2>
        <p className='text-sm text-subtle'>
          How motion tokens map to specific components. See{' '}
          <Link
            href='/foundations/interactions'
            className='underline underline-offset-2'
          >
            Interactions
          </Link>{' '}
          for the full <Code>is-interactive</Code> and{' '}
          <Code>is-field-interactive</Code> behaviour breakdown.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>What</th>
                <th className='py-2 pr-4 font-semibold'>Duration</th>
                <th className='py-2 pr-4 font-semibold'>Easing</th>
                <th className='py-2 font-semibold'>Notes</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              <tr>
                <td className='py-2 pr-4 text-strong'>Button hover/press</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  duration-moderate
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>ease-standard</td>
                <td className='py-2'>
                  Handled by <Code>is-interactive</Code>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Button transform</td>
                <td className='py-2 pr-4 font-mono text-xs'>duration-normal</td>
                <td className='py-2 pr-4 font-mono text-xs'>ease-spring</td>
                <td className='py-2'>
                  <Code>scale(0.99)</Code> on active press
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Input focus/hover</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  duration-moderate
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>ease-enter</td>
                <td className='py-2'>
                  Handled by <Code>is-field-interactive</Code>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Focus ring</td>
                <td className='py-2 pr-4 font-mono text-xs'>duration-normal</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  ease-standard / ease-enter
                </td>
                <td className='py-2'>Outline width and colour</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Caret rotation</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  duration-moderate
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>&mdash;</td>
                <td className='py-2'>Select and Combobox trigger icons</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Popup enter/exit</td>
                <td className='py-2 pr-4 font-mono text-xs'>duration-normal</td>
                <td className='py-2 pr-4 font-mono text-xs'>ease-spring</td>
                <td className='py-2'>
                  <Code>motion-scale-in</Code> / <Code>motion-scale-out</Code>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Accordion open/close</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  duration-moderate
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>ease-enter</td>
                <td className='py-2'>
                  CSS transition on <Code>height</Code> via{' '}
                  <Code>--collapsible-panel-height</Code>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Shadow on hover</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  duration-moderate
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>ease-standard</td>
                <td className='py-2'>
                  <Code>emphasis-raised</Code> lifts via{' '}
                  <Link
                    href='/foundations/elevation'
                    className='underline underline-offset-2'
                  >
                    Elevation
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
