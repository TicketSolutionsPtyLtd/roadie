import { Guideline } from '@/components/Guideline'

import { Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Interactions',
  description:
    'Interaction design principles and CSS utilities for building accessible, responsive UI.'
}

const intents = [
  { name: 'neutral', className: 'intent-neutral' },
  { name: 'accent', className: 'intent-accent' },
  { name: 'danger', className: 'intent-danger' },
  { name: 'success', className: 'intent-success' }
]

const emphasisLevels = [
  { name: 'emphasis-strong', label: 'Strong' },
  { name: 'emphasis-default', label: 'Default' },
  { name: 'emphasis-raised', label: 'Raised' }
]

export default function InteractionsPage() {
  return (
    <div className='grid gap-12'>
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Interactions</h1>
        <p className='text-lg text-subtle'>
          Interaction is a conversation. Details are the vocabulary. We build
          for the felt experience — not just what works, but what feels right.
        </p>
      </div>

      {/* ── Design principles ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Design principles</h2>
        <p className='text-subtle'>
          These principles guide how we handle interaction across Oztix
          applications. Follow them when building custom interactive UI.
        </p>

        {/* Keyboard and focus */}
        <div className='grid gap-6'>
          <h3 className='text-display-ui-3 text-strong'>Keyboard and focus</h3>

          <Guideline
            title='Keyboard works everywhere'
            description='The mouse is optional. Power users and assistive technologies rely on the keyboard.'
            doContent='Ensure all flows are keyboard-operable and follow WAI-ARIA Authoring Practices.'
            dontContent={
              <>
                Build &ldquo;clickable&rdquo; <Code>div</Code>s that cannot be
                focused or activated with Enter/Space.
              </>
            }
          />

          <Guideline
            title='Clear focus indicators'
            description='Navigation requires visibility. Users must always know where they are on the page.'
            doContent={
              <>
                Show a visible focus ring for every focusable element. Use{' '}
                <Code>:focus-visible</Code> to avoid distracting mouse users.
                Roadie&apos;s <Code>is-interactive</Code> provides this
                automatically.
              </>
            }
            dontContent={
              <>
                Remove outlines (<Code>outline: none</Code>) without replacing
                them with a high-contrast alternative.
              </>
            }
          />

          <Guideline
            title='Manage focus'
            description="Context changes require focus changes. Don't leave the user's focus behind when the UI changes."
            doContent='Use focus traps for modals. Move focus to new content after navigation. Return focus to the trigger when a menu closes.'
            dontContent='Open a modal but leave the focus on the button that opened it, hidden under the backdrop.'
          />
        </div>

        {/* Hit targets and touch */}
        <div className='grid gap-6'>
          <h3 className='text-display-ui-3 text-strong'>
            Hit targets and touch
          </h3>

          <Guideline
            title='Match visual and hit targets'
            description="Fitts' Law applies to code. What looks clickable must be clickable — at a comfortable size."
            doContent={
              <>
                Expand hit targets to &ge; 24px (desktop) or &ge; 44px (mobile),
                even if the icon is smaller. Use padding to expand the area.
              </>
            }
            dontContent='Wrap a tiny 12px icon in a click handler with no padding.'
          />

          <Guideline
            title='Mobile input hygiene'
            description='Prevent disorienting zooms. Inputs must be legible by default on touch devices.'
            doContent={
              <>
                Set <Code>&lt;input&gt;</Code> font size to &ge; 16px on mobile.
              </>
            }
            dontContent='Allow iOS Safari to auto-zoom/pan when an input is focused because the text is too small.'
          />

          <Guideline
            title='No dead zones'
            description='Proximity implies relationship. There should be no gap between a label and its control.'
            doContent='Wrap the input and label in a single clickable container. Clicking a visible label should focus its control.'
            dontContent='Leave an unclickable gap between a checkbox and its text.'
          />

          <Guideline
            title='Respect user agency'
            description='The browser belongs to the user. Never disable native capabilities like zooming or pasting.'
            doContent={
              <>
                Allow pasting in all <Code>&lt;input&gt;</Code> and{' '}
                <Code>&lt;textarea&gt;</Code> elements.
              </>
            }
            dontContent={
              <>
                Disable browser zoom (<Code>user-scalable=no</Code>) or block
                paste events for &ldquo;security.&rdquo;
              </>
            }
          />
        </div>

        {/* Forms */}
        <div className='grid gap-6'>
          <h3 className='text-display-ui-3 text-strong'>Forms</h3>

          <Guideline
            title='Labels are mandatory'
            description='Every control needs a name, even if visually hidden.'
            doContent={
              <>
                Ensure every control has a <Code>&lt;label&gt;</Code> or{' '}
                <Code>aria-label</Code>. Clicking a visible label should focus
                its control.
              </>
            }
            dontContent='Rely on placeholder text as the only label.'
          />

          <Guideline
            title='Placeholders are examples'
            description='Placeholders should show how to answer, not what to answer.'
            doContent={
              <>
                Use &ldquo;e.g. +1 (555) 000-0000&rdquo; as a placeholder to
                show the expected format.
              </>
            }
            dontContent='Repeat the label "Phone number" in the placeholder.'
          />

          <Guideline
            title='Enter submits'
            description='The Enter key is the universal "Done" signal.'
            doContent='Submit the form on Enter when a text input is focused. If multiple controls exist, apply to the last one.'
            dontContent='Force users to pick up the mouse to click "Save" after typing.'
          />

          <Guideline
            title='Keep submit active'
            description='Validation should be educational, not preventative. Disabled buttons hide the "why."'
            doContent='Keep the submit button active. Show validation errors on click.'
            dontContent='Disable the submit button while the form is incomplete.'
          />

          <Guideline
            title="Don't block typing"
            description='Inputs accept input. Let the user type, then correct them.'
            doContent='Allow any characters in a field, then show a validation error if they are invalid. Trim leading/trailing whitespace before validation.'
            dontContent='Silently block keystrokes (e.g., preventing non-numbers in a phone field) without feedback.'
          />

          <Guideline
            title='Inline errors'
            description='Contextualise failure. Show the error where the problem is.'
            doContent='Display error messages immediately next to the invalid field. Focus the first error on submit.'
            dontContent='Dump a generic "Form invalid" banner at the top of the page.'
          />

          <Guideline
            title='Autocomplete everywhere'
            description='Browsers are smart; let them help. Correct metadata enables one-click filling.'
            doContent={
              <>
                Set <Code>autocomplete</Code> attributes and meaningful{' '}
                <Code>name</Code> values on inputs.
              </>
            }
            dontContent={
              <>
                Use generic names like <Code>input_1</Code> that confuse
                password managers.
              </>
            }
          />

          <Guideline
            title='Unsaved changes protection'
            description='Data loss is a critical failure. Warn the user before destroying their work.'
            doContent='Trigger a confirmation dialog if the user tries to navigate away with dirty state.'
            dontContent='Let a stray back-swipe wipe out a 500-word essay.'
          />
        </div>

        {/* Feedback and state */}
        <div className='grid gap-6'>
          <h3 className='text-display-ui-3 text-strong'>Feedback and state</h3>

          <Guideline
            title='Honest loading states'
            description='For fast, reversible operations, skip the loader entirely and use optimistic UI instead.'
            doContent='For slow or high-stakes operations, show a loader — but commit to it for at least 300ms. Delay its appearance by 200ms to avoid flash on fast responses.'
            dontContent='Show a spinner for 50ms then immediately remove it. Flicker creates anxiety.'
          />

          <Guideline
            title='Optimistic UI'
            description="The interface should move as fast as the user's thought. Reserve loading states for high-stakes or slow operations."
            doContent='For fast, reversible actions (toggling a like, reordering a list), update the UI immediately and reconcile with the server in the background.'
            dontContent='Block the UI with a spinner for every server round-trip, even trivial ones.'
          />

          <Guideline
            title='Ellipsis implies continuation'
            description='An ellipsis indicates that an action is not yet complete or requires more input.'
            doContent={
              <>
                Use &ldquo;Rename&hellip;&rdquo; (opens a dialog) and
                &ldquo;Saving&hellip;&rdquo; (process in flight).
              </>
            }
            dontContent='Use "Rename" for a button that opens a modal — the user expects immediate action.'
          />

          <Guideline
            title='Destructive friction'
            description='Regret is expensive. Make irreversible actions hard to do by accident.'
            doContent='Require explicit confirmation or provide a generous "Undo" window for destructive actions.'
            dontContent='Delete a project immediately upon clicking a red trash icon.'
          />

          <Guideline
            title='Forgiving interactions'
            description='Users are imprecise. The interface should anticipate intent, not punish inaccuracy.'
            doContent='Use prediction cones for menus. Add debounce to tooltips (delay first, instant subsequent).'
            dontContent='Close a dropdown the millisecond the mouse leaves the trigger pixel.'
          />
        </div>
      </section>

      {/* ── Interaction utilities ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>Interaction utilities</h2>
        <p className='text-subtle'>
          Roadie provides two CSS utilities that encode many of these principles
          automatically. Apply them to elements that respond to user input.
        </p>

        {/* is-interactive */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-5 text-strong'>
            <Code>is-interactive</Code>
          </h3>
          <p className='text-subtle'>
            For clickable elements — buttons, cards, links, toggles. Provides
            cursor, transitions, active press, focus ring, and disabled state.
            Pair with an <Code>emphasis-*</Code> class for visual styling.
          </p>

          <div className='rounded-lg emphasis-subtle p-6'>
            <div className='flex flex-wrap items-center gap-3'>
              <button
                type='button'
                className='is-interactive emphasis-strong rounded-full px-4 py-2 text-sm font-bold'
              >
                Strong
              </button>
              <button
                type='button'
                className='is-interactive emphasis-default rounded-full px-4 py-2 text-sm font-bold text-subtle'
              >
                Default
              </button>
              <button
                type='button'
                className='is-interactive rounded-full emphasis-subtle px-4 py-2 text-sm font-bold text-subtle'
              >
                Subtle
              </button>
              <button
                type='button'
                className='is-interactive rounded-full emphasis-subtler px-4 py-2 text-sm font-bold text-subtle'
              >
                Subtler
              </button>
              <button
                type='button'
                disabled
                className='is-interactive emphasis-strong rounded-full px-4 py-2 text-sm font-bold'
              >
                Disabled
              </button>
            </div>
            <p className='mt-3 text-xs text-subtler'>
              Hover, click, and tab through these buttons to see transitions,
              active press, and focus rings.
            </p>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-subtle text-left'>
                  <th className='py-2 pr-4 font-semibold'>Behaviour</th>
                  <th className='py-2 font-semibold'>How</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-subtler text-subtle'>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Cursor</td>
                  <td className='py-2'>
                    <Code>cursor: pointer</Code>
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Transitions</td>
                  <td className='py-2'>
                    background, border, color, box-shadow, outline, transform
                    &mdash; 0.2s ease
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Active press</td>
                  <td className='py-2'>
                    <Code>scale(0.99)</Code>
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Focus ring</td>
                  <td className='py-2'>
                    <Code>:focus-visible</Code> outline, intent-coloured with
                    transparency
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Disabled</td>
                  <td className='py-2'>
                    <Code>opacity: 0.5</Code>, <Code>pointer-events: none</Code>
                    , <Code>grayscale(0.3)</Code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Intent-coloured focus rings */}
          <div className='grid gap-2'>
            <p className='text-sm text-strong'>Intent-coloured focus rings</p>
            <p className='text-sm text-subtle'>
              The focus ring colour follows the nearest <Code>intent-*</Code>{' '}
              ancestor. Tab through these to see the ring change.
            </p>
            <div className='rounded-lg emphasis-subtle p-6'>
              <div className='flex flex-wrap gap-4'>
                {intents.map(({ name, className }) => (
                  <div key={name} className={className}>
                    <button
                      type='button'
                      className='is-interactive emphasis-strong rounded-full px-4 py-2 text-sm font-bold'
                    >
                      {name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* is-field-interactive */}
        <div className='grid gap-4'>
          <h3 className='text-display-ui-5 text-strong'>
            <Code>is-field-interactive</Code>
          </h3>
          <p className='text-subtle'>
            For form inputs — text fields, textareas, selects. Provides
            state-based colour transitions: neutral at rest, accent on focus,
            danger when invalid. Pair with <Code>emphasis-sunken</Code> or{' '}
            <Code>emphasis-raised</Code>.
          </p>

          <div className='rounded-lg emphasis-subtle p-6'>
            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='grid gap-1'>
                <label className='text-sm text-strong'>Default</label>
                <input
                  type='text'
                  placeholder='e.g. Jane Smith'
                  className='is-field-interactive rounded-md border border-subtle emphasis-sunken px-3 py-2 text-sm'
                />
              </div>
              <div className='grid gap-1'>
                <label className='text-sm text-strong'>Invalid</label>
                <input
                  type='text'
                  defaultValue='bad@'
                  aria-invalid='true'
                  className='is-field-interactive rounded-md border border-subtle emphasis-sunken px-3 py-2 text-sm'
                />
              </div>
              <div className='grid gap-1'>
                <label className='text-sm text-strong'>Disabled</label>
                <input
                  type='text'
                  disabled
                  placeholder='Cannot edit'
                  className='is-field-interactive rounded-md border border-subtle emphasis-sunken px-3 py-2 text-sm'
                />
              </div>
            </div>
            <p className='mt-3 text-xs text-subtler'>
              Focus each input to see the accent border and ring. The invalid
              field shows danger styling.
            </p>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-subtle text-left'>
                  <th className='py-2 pr-4 font-semibold'>State</th>
                  <th className='py-2 pr-4 font-semibold'>Background</th>
                  <th className='py-2 pr-4 font-semibold'>Border</th>
                  <th className='py-2 font-semibold'>Outline</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-subtler text-subtle'>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Rest</td>
                  <td className='py-2 pr-4'>from emphasis</td>
                  <td className='py-2 pr-4'>from emphasis</td>
                  <td className='py-2'>none</td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Hover</td>
                  <td className='py-2 pr-4'>neutral-2</td>
                  <td className='py-2 pr-4'>neutral-7</td>
                  <td className='py-2'>&mdash;</td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Focus</td>
                  <td className='py-2 pr-4'>accent-2</td>
                  <td className='py-2 pr-4'>accent-9</td>
                  <td className='py-2'>accent ring</td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Invalid</td>
                  <td className='py-2 pr-4'>danger-2</td>
                  <td className='py-2 pr-4'>danger-9</td>
                  <td className='py-2'>danger ring</td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Disabled</td>
                  <td className='py-2 pr-4' colSpan={3}>
                    <Code>opacity: 0.5</Code>, <Code>pointer-events: none</Code>
                    , <Code>grayscale(0.3)</Code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Emphasis + interaction layering ── */}
      <section className='grid gap-6'>
        <h2 className='text-display-ui-3 text-strong'>
          Emphasis + interaction layering
        </h2>
        <p className='text-subtle'>
          Emphasis presets and interaction utilities compose together. The
          emphasis sets appearance and hover/active colour shifts. The
          interaction utility adds mechanical behaviours. Together they form a
          complete interactive element.
        </p>

        <div className='grid gap-2'>
          <p className='text-sm text-strong'>
            Static vs interactive &mdash; hover to see the difference
          </p>
          <div className='grid gap-4 sm:grid-cols-2'>
            {emphasisLevels.map(({ name, label }) => (
              <div key={name} className='grid gap-3'>
                <div className='grid gap-2'>
                  <div className={`${name} rounded-lg p-6`}>
                    <p className='font-mono text-sm'>{name} (static)</p>
                  </div>
                  <div
                    className={`${name} is-interactive rounded-lg p-6`}
                    // biome-ignore lint: tabIndex for demo purposes
                    tabIndex={0}
                    role='button'
                  >
                    <p className='font-mono text-sm'>{name} + is-interactive</p>
                    <p className='mt-1 text-xs opacity-70'>
                      Hover, click, or tab to {label.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-lg emphasis-subtle p-4'>
          <p className='text-sm text-subtle'>
            <strong className='text-strong'>Note:</strong>{' '}
            <Code>is-field-interactive</Code> provides its own hover, focus, and
            invalid logic — it does not use emphasis hover states. This is why
            form inputs use <Code>emphasis-sunken</Code> (which has no
            interactive states) paired with <Code>is-field-interactive</Code>{' '}
            (which provides all of them).
          </p>
        </div>

        {/* Component recipes */}
        <div className='grid gap-2'>
          <h3 className='text-display-ui-5 text-strong'>Component recipes</h3>
          <p className='text-sm text-subtle'>
            Common patterns from the component library.
          </p>

          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-subtle text-left'>
                  <th className='py-2 pr-4 font-semibold'>Component</th>
                  <th className='py-2 font-semibold'>Classes</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-subtler text-subtle'>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Button (primary)</td>
                  <td className='py-2 font-mono text-xs'>
                    emphasis-strong is-interactive rounded-full
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Button (secondary)</td>
                  <td className='py-2 font-mono text-xs'>
                    emphasis-default is-interactive rounded-full
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Button (subtler)</td>
                  <td className='py-2 font-mono text-xs'>
                    emphasis-subtler is-interactive rounded-full
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Text input</td>
                  <td className='py-2 font-mono text-xs'>
                    emphasis-sunken border border-subtle is-field-interactive
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Select</td>
                  <td className='py-2 font-mono text-xs'>
                    emphasis-raised border border-default is-field-interactive
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Clickable card</td>
                  <td className='py-2 font-mono text-xs'>
                    emphasis-raised is-interactive rounded-lg
                  </td>
                </tr>
                <tr>
                  <td className='py-2 pr-4 text-strong'>Radio (inline)</td>
                  <td className='py-2 font-mono text-xs'>
                    emphasis-subtler is-interactive
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Quick reference ── */}
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Quick reference</h2>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-subtle text-left'>
                <th className='py-2 pr-4 font-semibold'>Element</th>
                <th className='py-2 pr-4 font-semibold'>Utility</th>
                <th className='py-2 pr-4 font-semibold'>Emphasis</th>
                <th className='py-2 font-semibold'>Notes</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-subtler text-subtle'>
              <tr>
                <td className='py-2 pr-4 text-strong'>Button</td>
                <td className='py-2 pr-4 font-mono text-xs'>is-interactive</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  strong / default / subtle / subtler
                </td>
                <td className='py-2'>
                  Add <Code>rounded-full</Code>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Text input</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  is-field-interactive
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>sunken</td>
                <td className='py-2'>
                  Add <Code>border border-subtle</Code>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Select</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  is-field-interactive
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>raised</td>
                <td className='py-2'>
                  Add <Code>border border-default</Code>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Textarea</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  is-field-interactive
                </td>
                <td className='py-2 pr-4 font-mono text-xs'>sunken</td>
                <td className='py-2'>
                  Add <Code>border border-subtle</Code>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Clickable card</td>
                <td className='py-2 pr-4 font-mono text-xs'>is-interactive</td>
                <td className='py-2 pr-4 font-mono text-xs'>raised</td>
                <td className='py-2'>
                  Add <Code>rounded-lg</Code>
                </td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Toggle / radio</td>
                <td className='py-2 pr-4 font-mono text-xs'>is-interactive</td>
                <td className='py-2 pr-4 font-mono text-xs'>
                  subtler or default
                </td>
                <td className='py-2'>&mdash;</td>
              </tr>
              <tr>
                <td className='py-2 pr-4 text-strong'>Link</td>
                <td className='py-2 pr-4 font-mono text-xs'>none (native)</td>
                <td className='py-2 pr-4 font-mono text-xs'>&mdash;</td>
                <td className='py-2'>
                  Use <Code>underline underline-offset-2</Code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
