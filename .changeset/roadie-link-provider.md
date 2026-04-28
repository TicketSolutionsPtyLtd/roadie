---
'@oztix/roadie-components': minor
---

Smart `href` routing across every link-bearing component, plus
`RoadieLinkProvider` for app-level Link injection. `LinkButton` /
`LinkIconButton` are now soft-deprecated.

## What's new

- **`RoadieLinkProvider`** — a single context-injected provider that
  supplies the consumer's Link component (typically `next/link`) to
  every Roadie surface that accepts `href`. Wire it once at the app
  root, and internal links route through your client router
  automatically. Apps without a provider fall back to plain `<a>`.

  ```tsx
  import NextLink from 'next/link'
  import { RoadieLinkProvider, ThemeProvider } from '@oztix/roadie-components'

  <RoadieLinkProvider Link={NextLink}>
    <ThemeProvider>{children}</ThemeProvider>
  </RoadieLinkProvider>
  ```

- **`href` on every link-bearing component** — `Button`, `IconButton`,
  `Card`, `Breadcrumb.Link`, `Carousel.TitleLink`, and `Tabs.Tab` now
  accept `href`. Internal hrefs route through the configured Link;
  external hrefs (`http(s)://`, `//…`) auto-render
  `<a target='_blank' rel='noopener noreferrer'>`; `mailto:` / `tel:` /
  `sms:` render plain `<a>` with no target. Override via `external`,
  `target`, or `rel`.

  ```tsx
  <Button href='/events/123'>View event</Button>
  <Button href='https://stripe.com/docs'>Stripe docs</Button>
  <Card href='/event/123'>{/* whole-card link, with is-interactive */}</Card>
  <Breadcrumb.Link href='/events'>Events</Breadcrumb.Link>
  <Tabs.Tab value='events' href='/events'>Events</Tabs.Tab>
  ```

- **`IconButton` size DX** — accepts plain `'xs' | 'sm' | 'md' | 'lg'`
  and maps to the underlying `btn-icon-*` classes. Default flips from
  `'icon-md'` to `'md'`. Legacy `'icon-*'` literals still accepted via
  a `@deprecated` alias.

## What's deprecated (still works, removed in v3.0.0)

- **`LinkButton` / `LinkIconButton`** — JSDoc `@deprecated`. They keep
  their public type signatures (including the `<T extends ElementType>`
  generic and the `as` prop) and their original anchor-with-button-
  classes rendering. New code should use `<Button href={…}>` and
  `<IconButton href={…}>` instead.

- **`'icon-*'` size literals on `IconButton` / `LinkIconButton`** —
  use `'xs' | 'sm' | 'md' | 'lg'` instead.

## Notes for consumers

- Existing `<Button onClick={…}>`, `<Button render={<a>}>`, and
  `<Card as='a' href=…>` call sites are untouched.
- Passing both `href` and an explicit `render` to Button emits a
  one-shot dev-mode warning — `render` wins, provider routing is
  silently disabled. Pick one.
- `as` always wins over `href` smart-routing for non-Base-UI
  components (Card, Breadcrumb.Link, Carousel.TitleLink). It's the
  documented escape hatch.
- Server-safe components (Card, Breadcrumb.Link) stay server-safe —
  the smart-href delegation crosses to the client only when `href` is
  set, via Next's standard module-graph boundary.

## Where to read more

- Full plan: `docs/plans/2026-04-28-001-feat-roadie-link-provider-and-tracking-pattern-plan.md`
- Foundations / Linking docs page (forthcoming)
