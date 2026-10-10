---
'@oztix/roadie-components': minor
---

`Prose` makes wide tables reachable and scrollable with the keyboard.

- `Prose` wraps each bare table in `<div class="prose-scroll is-focusable">`,
  both tables in its JSX children and tables in HTML it renders through
  `dangerouslySetInnerHTML`, such as CMS output. A table already in
  `.prose-scroll`, `.not-prose`, or `data-not-prose` stays as it is, and a
  `.prose-bleed` table passes the class to its wrapper.
- While a table overflows, its scroller gets `tabIndex={0}`, `role="region"`,
  and a name: the table's caption, else the nearest heading before it with an
  `id`, else "Table". A later table under the same heading is numbered. A table
  that fits adds no tab stop. This also applies to `.prose-scroll` wrappers you
  write yourself.
- Tables in rendered HTML are wrapped after hydration, and tab stops are added
  after hydration, so server markup still matches.
- Each column of a wrapped table stays at least 9em wide and its inline code
  stays on one line, as in any `.prose-scroll`, so a table that used to squeeze
  into its column now scrolls.
- A table that a component renders inside `Prose` isn't wrapped, since React
  owns it. Wrap it in `.prose-scroll` yourself.
- `Prose` is now a client component. Server components can still render it
  with children, `dangerouslySetInnerHTML`, `as='article'`, or
  `render={<article />}`, but not with a function `render` or a component `as`,
  which can't cross to the client. `proseVariants` stays callable on the server.

New `useScrollRegion(ref)` from `@oztix/roadie-components/scroll-region` gives
any scroll container the same keyboard access, for tables outside `Prose`.
