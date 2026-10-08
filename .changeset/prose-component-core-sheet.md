---
'@oztix/roadie-components': minor
---

`Prose` now renders the core `.prose` class instead of its own list of
descendant classes. Its sizes only set `--prose-*` variables, and `render`,
`as`, and `size` work as before. Pages that use `Prose` will look different, so
check legal pages, FAQs, and content sections after upgrading.

What changes on the page:

- Space now goes above each block only, in `em`, from one `--prose-flow`
  variable: 1em at `sm`, and 1.25em at `md` and `lg`. Paragraphs sit 14px
  apart at `sm`, up from 8px, 20px at `md`, up from 16px, and 23 to 25px at
  `lg`, close to the old 24px. The first child sits flush with the top.
- Space above a heading is a multiple of the flow at the heading's own size,
  so it grows with the heading: an `h2` at `md` now has 48 to 72px above it,
  up from 32px. The block after a heading sits half a flow below it, 10px at
  `md`, down from 16px.
- List items sit 0.4 of a flow apart (8px at `md`, up from 4px), and a rule
  has two flows above it and one below.
- Each direct child stops at a 65ch measure, so long lines no longer run the
  full width of the container.
- Body text is 14px at `sm`, 16px at `md`, and the fluid `text-lg` at `lg`,
  all at the prose leading of 1.5. Before, `sm` and `lg` took the tighter line
  height of the page around them.
- Headings at `sm` use the UI display styles, with `h1` to `h6` matching
  `text-display-ui-1` to `-6`. `h1` to `h5` are one step larger than before,
  and `h6` is unchanged. `md` and `lg` keep the prose display styles.
- Links keep the surrounding text colour with an accent underline that turns
  to the text colour on hover.
- List indent is 1.5em, so it scales with the size (24px at `md`, as before),
  and a nested bulleted list uses circles.
- Tables shrink to fit their content instead of filling the width. Wrap a wide
  table in `<div class="prose-scroll">` so it scrolls sideways on a phone.
- Code blocks and images use `rounded-md`, down from `rounded-lg`.
- Inline code uses the subtle fill, up from subtler, at 0.875em, down from
  0.9em.

New escapes:

- `.not-prose` or `data-not-prose` on an element inside `Prose` keeps the
  styles away from it and everything inside it. A `Prose` nested inside one
  stays unstyled.
- A `Button` or other component that renders an `<a>` inside `Prose` picks up
  the prose underline. Wrap it in `.not-prose`.
- `.prose-bleed` on a direct child lifts the 65ch measure.

To restore old behaviour where a page needs it, add a class to `Prose`:

- Full-width text: `className='[--prose-measure:none]'`.
- Full-width tables: `className='[&_table]:w-full'`, plus `.prose-bleed` on
  each table, or on its `.prose-scroll` wrapper, so it passes the 65ch measure.
- The old `md` gap of 1rem: `className='[--prose-flow:1em]'`.

`proseVariants` now returns `prose` and the size variables only.
