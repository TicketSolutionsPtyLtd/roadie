import Link from 'next/link'

import { Guideline } from '@/components/Guideline'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Accessibility',
  description:
    'Accessibility principles and testing guidance for building inclusive Oztix applications.'
}

export default function AccessibilityPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Accessibility</h1>
        <p className='text-lg text-subtle'>
          Accessibility is not a feature — it&apos;s a quality bar. HTML is the
          accessible baseline. Browsers provide accessibility for free if you
          use semantic elements.
        </p>
      </div>

      {/* ── Semantic HTML first ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Semantic HTML first</h2>
        <p className='text-subtle'>
          If you use a <Code>&lt;div&gt;</Code> for a button, you have to
          rebuild 20 years of browser engineering yourself. Use the right
          element and get keyboard, focus, and screen reader support for free.
        </p>

        <Guideline
          title='Use native elements'
          description='Native elements carry semantics, keyboard behaviour, and ARIA roles automatically.'
        >
          <Guideline.Do
            code={`<button onClick={handleSave}>Save</button>
<a href="/settings">Settings</a>
<nav aria-label="Main">…</nav>
<main>…</main>`}
          >
            Use <Code>&lt;button&gt;</Code> for actions, <Code>&lt;a&gt;</Code>{' '}
            for navigation, <Code>&lt;nav&gt;</Code>, <Code>&lt;main&gt;</Code>,{' '}
            <Code>&lt;article&gt;</Code> for landmarks.
          </Guideline.Do>
          <Guideline.Dont
            code={`<div onClick={handleSave} className="btn">Save</div>
<span onClick={() => navigate('/settings')}>Settings</span>`}
          >
            Use <Code>&lt;div&gt;</Code> or <Code>&lt;span&gt;</Code> with click
            handlers to create custom buttons or links. You lose keyboard
            support, focus management, and screen reader announcements.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Meaningful document structure'
          description='Heading hierarchy is the table of contents for screen reader users.'
        >
          <Guideline.Do>
            Use headings in order (<Code>&lt;h1&gt;</Code> →{' '}
            <Code>&lt;h2&gt;</Code> → <Code>&lt;h3&gt;</Code>). Don&apos;t skip
            levels. Every page should have exactly one <Code>&lt;h1&gt;</Code>.
          </Guideline.Do>
          <Guideline.Dont>
            Choose heading levels based on visual size. Use{' '}
            <Code>&lt;h4&gt;</Code> after <Code>&lt;h2&gt;</Code> because it
            looks right — use text utility classes for visual sizing instead.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── ARIA as a last resort ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>ARIA as a last resort</h2>
        <p className='text-subtle'>
          The first rule of ARIA is don&apos;t use ARIA — if a native HTML
          element with the semantics you need exists, use it. ARIA supplements
          HTML; it doesn&apos;t replace it.
        </p>

        <Guideline
          title='Prefer native over ARIA'
          description='ARIA overrides native semantics. Used incorrectly, it makes things worse, not better.'
        >
          <Guideline.Do
            code={`<!-- Native checkbox — keyboard, focus, state for free -->
<input type="checkbox" id="terms" />
<label htmlFor="terms">I agree to the terms</label>`}
          >
            Reach for ARIA only when there is no native element for the pattern
            (e.g., tabs, tree views, comboboxes). Roadie&apos;s Base UI
            components handle ARIA attributes automatically for these cases.
          </Guideline.Do>
          <Guideline.Dont
            code={`<!-- Reinventing a checkbox from scratch -->
<div role="checkbox" aria-checked="false"
  tabIndex={0} onClick={toggle}
  onKeyDown={handleKeyDown}>
  I agree to the terms
</div>`}
          >
            Build custom ARIA widgets when a native element exists. Every
            attribute you add manually is an attribute you must maintain.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── Color and contrast ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Color and contrast</h2>
        <p className='text-subtle'>
          Sufficient contrast is non-negotiable. Never convey meaning through
          colour alone. See{' '}
          <Link
            href='/foundations/colors'
            className='underline underline-offset-2'
          >
            Colors
          </Link>{' '}
          for the full colour system.
        </p>

        <Guideline
          title='Meet WCAG AA contrast ratios'
          description='4.5:1 for normal text. 3:1 for large text (18px bold / 24px regular) and UI components.'
        >
          <Guideline.Do>
            Use Roadie&apos;s semantic text colours (<Code>text-normal</Code>,{' '}
            <Code>text-subtle</Code>, <Code>text-strong</Code>) which are
            designed to meet contrast ratios in both light and dark modes.
          </Guideline.Do>
          <Guideline.Dont>
            Use raw colour values without checking contrast. Light grey text on
            a white background may look subtle but fails WCAG.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Colour is not the only signal'
          description='Colour-blind users cannot distinguish red from green. Always pair colour with another indicator.'
        >
          <Guideline.Do>
            Pair colour with icons, text labels, or patterns. An error state
            uses <Code>intent-danger</Code> (red) plus an error icon plus error
            text.
          </Guideline.Do>
          <Guideline.Dont>
            Indicate success or failure only through green/red colouring with no
            supporting text or icon.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── Keyboard and focus ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Keyboard and focus</h2>
        <p className='text-subtle'>
          Keyboard accessibility is covered in depth in the{' '}
          <Link
            href='/foundations/interactions'
            className='underline underline-offset-2'
          >
            Interactions
          </Link>{' '}
          foundation — including keyboard operability, visible focus indicators,
          focus management, and hit targets.
        </p>
      </section>

      {/* ── Reduced motion ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Reduced motion</h2>
        <p className='text-subtle'>
          Motion can cause nausea and disorientation. Roadie includes a global{' '}
          <Code>prefers-reduced-motion</Code> reset. See{' '}
          <Link
            href='/foundations/motion'
            className='underline underline-offset-2'
          >
            Motion
          </Link>{' '}
          for full details on duration tokens, easing, and how to test.
        </p>
      </section>

      {/* ── Screen readers ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Screen readers</h2>
        <p className='text-subtle'>
          Screen readers interpret the DOM, not the pixels. What you see is not
          what they hear.
        </p>

        <Guideline
          title='Meaningful alt text'
          description='Images without alt text are invisible to screen readers. Decorative images need empty alt.'
        >
          <Guideline.Do
            code={`<!-- Informative image -->
<img src="seating-map.png" alt="Venue seating map showing sections A through F" />

<!-- Decorative image -->
<img src="divider.svg" alt="" />`}
          >
            Write alt text that describes the content or function of the image,
            not its appearance. Use empty <Code>alt=&quot;&quot;</Code> for
            purely decorative images.
          </Guideline.Do>
          <Guideline.Dont>
            Omit the <Code>alt</Code> attribute entirely (screen readers will
            read the filename) or write &ldquo;image&rdquo; as alt text.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Announce dynamic content'
          description='Screen readers don&rsquo;t automatically notice DOM changes. Tell them what changed.'
        >
          <Guideline.Do
            code={`<!-- Announce status updates -->
<div role="status" aria-live="polite">
  3 items added to cart
</div>

<!-- Announce urgent errors -->
<div role="alert">
  Payment failed. Please try again.
</div>`}
          >
            Use <Code>aria-live=&quot;polite&quot;</Code> for non-urgent updates
            (status messages, search results). Use{' '}
            <Code>role=&quot;alert&quot;</Code> for urgent notifications
            (errors, warnings).
          </Guideline.Do>
          <Guideline.Dont>
            Update content silently. A toast notification that isn&apos;t
            announced leaves screen reader users unaware of what happened.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── Forms ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Forms</h2>
        <p className='text-subtle'>
          Form interaction patterns (labels, placeholders, validation, submit
          behaviour) are covered in{' '}
          <Link
            href='/foundations/interactions'
            className='underline underline-offset-2'
          >
            Interactions
          </Link>
          . This section covers the ARIA-specific attributes that make forms
          accessible to assistive technology.
        </p>

        <Guideline
          title='Associate errors with fields'
          description='Screen readers need a programmatic link between an input and its error message.'
        >
          <Guideline.Do
            code={`<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && (
  <p id="email-error" role="alert">
    Enter a valid email address
  </p>
)}`}
          >
            Use <Code>aria-describedby</Code> to link error messages to their
            field. Use <Code>aria-invalid</Code> to indicate the field has an
            error.
          </Guideline.Do>
          <Guideline.Dont>
            Show a red border and error text next to a field without any
            programmatic association — sighted users see it, screen reader users
            don&apos;t.
          </Guideline.Dont>
        </Guideline>

        <Guideline
          title='Group related fields'
          description='Field groups need a shared label so screen readers announce the context.'
        >
          <Guideline.Do
            code={`<fieldset>
  <legend>Billing address</legend>
  <label htmlFor="street">Street</label>
  <input id="street" />
  <label htmlFor="city">City</label>
  <input id="city" />
</fieldset>`}
          >
            Use <Code>&lt;fieldset&gt;</Code> and <Code>&lt;legend&gt;</Code> to
            group related fields. Screen readers announce the legend before each
            field in the group.
          </Guideline.Do>
          <Guideline.Dont>
            Group fields under a visual heading with no programmatic
            relationship. Screen reader users won&apos;t know the fields are
            related.
          </Guideline.Dont>
        </Guideline>
      </section>

      {/* ── What Roadie handles ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>What Roadie handles</h2>
        <p className='text-subtle'>
          The design system provides accessible primitives. You get these for
          free when using Roadie components.
        </p>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>
              Base UI primitives
            </h3>
            <p className='text-sm text-subtle'>
              Components built on Base UI provide correct ARIA attributes, focus
              management, and keyboard navigation out of the box.
            </p>
          </div>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>Focus rings</h3>
            <p className='text-sm text-subtle'>
              <Code>is-interactive</Code> provides visible{' '}
              <Code>:focus-visible</Code> rings coloured by the nearest intent.
            </p>
          </div>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>
              Field state styling
            </h3>
            <p className='text-sm text-subtle'>
              <Code>is-field-interactive</Code> provides visual state
              transitions for focus and <Code>aria-invalid</Code> automatically.
            </p>
          </div>
          <div className='grid content-start gap-2 rounded-xl emphasis-subtle p-5'>
            <h3 className='text-display-ui-5 text-strong'>
              Contrast-safe tokens
            </h3>
            <p className='text-sm text-subtle'>
              Semantic colour tokens (<Code>text-normal</Code>,{' '}
              <Code>text-subtle</Code>) are designed to maintain contrast ratios
              in both light and dark modes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Testing checklist ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Testing checklist</h2>
        <p className='text-subtle'>
          Run through this checklist before shipping. Automated tools catch
          about 30% of issues — the rest requires manual testing.
        </p>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Test</th>
                <th className='py-2 pr-4 font-semibold'>How</th>
                <th className='py-2 font-semibold'>What to check</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              <tr>
                <td className='py-2 pr-4 text-strong'>Keyboard</td>
                <td className='py-2 pr-4'>Tab through the page</td>
                <td className='py-2'>
                  Every interactive element reachable and operable. Focus order
                  is logical. No keyboard traps.
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Screen reader</td>
                <td className='py-2 pr-4'>
                  VoiceOver (macOS) or NVDA (Windows)
                </td>
                <td className='py-2'>
                  Content is announced meaningfully. Dynamic updates are heard.
                  Form errors are associated.
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Contrast</td>
                <td className='py-2 pr-4'>
                  Browser DevTools or contrast checker
                </td>
                <td className='py-2'>
                  All text meets WCAG AA. UI components meet 3:1.
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Reduced motion</td>
                <td className='py-2 pr-4'>
                  DevTools → Rendering → Emulate prefers-reduced-motion
                </td>
                <td className='py-2'>
                  No animations play. No functionality is lost.
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Zoom</td>
                <td className='py-2 pr-4'>Browser zoom to 200%</td>
                <td className='py-2'>
                  No content is clipped or overlapping. Layout reflows
                  gracefully.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
