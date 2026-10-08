---
'@oztix/roadie-components': minor
---

`Prose` now renders the core `.prose` class instead of its own list of
descendant classes. Its sizes only set `--prose-*` variables, and `render`,
`as`, and `size` work as before. Pages that use `Prose` will look different, so
check legal pages, FAQs, and content sections after upgrading.

What changes on the page:

- Space now goes above each block only, in `em`, from one `--prose-flow`
  variable: 1em at `sm`, and 1.25em at `md` and `lg`. Paragraphs at `md` sit
  20px apart, up from 16px. Headings get more space above than below, and the
  first child sits flush with the top.
- Each direct child stops at a 65ch measure, so long lines no longer run the
  full width of the container.
- Body text is 14px at `sm`, 16px at `md`, and the fluid `text-lg` at `lg`,
  all at the prose leading of 1.5.
- Headings at `sm` use the UI display styles, with `h1` to `h6` matching
  `text-display-ui-1` to `-6`, one step larger than before. `md` and `lg` keep
  the prose display styles.
- Links keep the surrounding text colour with an accent underline that turns
  to the text colour on hover.
- List indent is 1.5em, so it scales with the size, and a nested bulleted list
  uses circles.
- Tables shrink to fit their content instead of filling the width. Wrap a wide
  table in `<div class="prose-scroll">` so it scrolls sideways on a phone.
- Code blocks and images use `rounded-md`, down from `rounded-lg`.
- Inline code uses the subtle fill at 0.875em.

New escapes:

- `.not-prose` or `data-not-prose` on an element inside `Prose` keeps the
  styles away from it and everything inside it. A `Prose` nested inside one
  stays unstyled.
- A `Button` or other component that renders an `<a>` inside `Prose` picks up
  the prose underline. Wrap it in `.not-prose`.
- `.prose-bleed` on a direct child lifts the 65ch measure.

To restore old behaviour where a page needs it, add a class to `Prose`:

- Full-width text: `className='[--prose-measure:none]'`.
- Full-width tables: `className='[&_table]:w-full'`.
- The old `md` gap of 1rem: `className='[--prose-flow:1em]'`.

`proseVariants` now returns `prose` and the size variables only.
