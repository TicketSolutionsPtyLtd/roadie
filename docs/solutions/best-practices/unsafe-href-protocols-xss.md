---
title: Block unsafe `href` protocols in design-system link components
date: 2026-04-29
category: best-practices
module: components
problem_type: best_practice
component: tooling
severity: high
applies_when:
  - Building a design-system component that accepts `href` from caller code
  - The href value can flow from CMS content, URL params, user input, or untrusted JSON
  - The component renders the href into an `<a>` element
symptoms:
  - A link clicks and executes JavaScript instead of navigating
  - `javascript:`, `data:`, `vbscript:`, `blob:`, or `file:` URLs reach the rendered DOM
  - Security review flags the component as a potential XSS vector
root_cause: missing_guard
resolution_type: code_fix
related_components:
  - Button
  - IconButton
  - Card
  - Breadcrumb
  - Carousel
  - Tabs
tags:
  - xss
  - security
  - href
  - sanitization
  - design-system
  - link-component
---

# Block unsafe `href` protocols in design-system link components

## Context

A design system that accepts an `href` prop on link-shaped components
(`<Button href={…}>`, `<Card href={…}>`, etc.) becomes the rendering
boundary for any href that flows through the app. If the system passes
the href straight to `<a href={value}>`, every consumer is responsible
for sanitizing user-controlled URLs before they reach the design
system — and that responsibility is silently distributed across every
call site. One forgotten validation and `javascript:alert(document.cookie)`
ships.

The original Roadie `resolveLinkKind` classified hrefs into `'button' |
'external' | 'protocol' | 'internal'` and let everything that wasn't
`https://`, `mailto:`, etc. fall through to `'internal'` — including
`javascript:`, `data:`, `vbscript:`, `blob:`, and `file:`. An
adversarial code-review subagent flagged this with 0.97 confidence as
the highest-severity issue in the PR.

## Guidance

Classify dangerous protocols explicitly and refuse to render them.
Don't accept `javascript:` or `data:` as a valid `href` shape — the
design system is the right place to draw that line.

```ts
// utils/resolveLinkKind.ts
export type ResolvedLinkKind =
  | 'button'
  | 'external'
  | 'protocol'
  | 'internal'
  | 'unsafe' // ← new

const EXTERNAL_PATTERN = /^(https?:)?\/\//i
const PROTOCOL_PATTERN = /^(mailto|tel|sms):/i
const UNSAFE_PATTERN = /^\s*(javascript|data|vbscript|blob|file):/i
//                     ^^^ leading whitespace stripped — `\tjavascript:` is still unsafe

export function resolveLinkKind(href: string | undefined): ResolvedLinkKind {
  if (href === undefined) return 'button'
  if (UNSAFE_PATTERN.test(href)) return 'unsafe' // ← check first
  if (EXTERNAL_PATTERN.test(href)) return 'external'
  if (PROTOCOL_PATTERN.test(href)) return 'protocol'
  return 'internal'
}
```

The component that consumes the helper renders `<a href='#'>` for the
`'unsafe'` branch and logs a dev-only warning so the bug is visible at
authoring time:

```tsx
// components/Link/RoadieRoutedLink.tsx
if (kind === 'unsafe') {
  if (isDev()) {
    console.warn(
      `[Roadie] Refused to render an unsafe href: ${JSON.stringify(href)}. ` +
        `\`javascript:\`, \`data:\`, \`vbscript:\`, \`blob:\`, and \`file:\` ` +
        `URLs are blocked to prevent XSS via user-controlled hrefs. ` +
        `If you need this URL, sanitize at the boundary and pass an ` +
        `explicit \`render\` prop with your own anchor.`
    )
  }
  return <a ref={ref} href='#' {...rest} />
}
```

Test the boundary:

```ts
it('refuses javascript: hrefs and renders href="#"', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { getByTestId } = render(
    <RoadieRoutedLink data-testid='link' href='javascript:alert(1)'>
      Pwn
    </RoadieRoutedLink>
  )
  expect(getByTestId('link')).toHaveAttribute('href', '#')
  expect(warn).toHaveBeenCalledWith(expect.stringMatching(/unsafe href/i))
})

it('matches case-insensitively + leading whitespace', () => {
  expect(resolveLinkKind('JavaScript:alert(1)')).toBe('unsafe')
  expect(resolveLinkKind('  javascript:alert(1)')).toBe('unsafe')
})

it('does NOT misclassify innocent paths starting with similar text', () => {
  expect(resolveLinkKind('/javascript-tutorial')).toBe('internal')
  expect(resolveLinkKind('https://example.com/data:foo')).toBe('external')
})
```

## Why This Matters

**`<a href="javascript:…">` executes on click.** Browsers fire the
JavaScript URL with the page's origin and `document.cookie` access.
A CMS field, a redirect param, or a malformed deep link reaching
`<Button href={value}>` is a one-step path to XSS.

**Consumer-side sanitization scales badly.** Every team using the
design system needs to remember to sanitize before passing href.
That's a security policy distributed across N apps, M components per
app, and reapplied every time a new contributor touches a link.
Centralizing the block at the design-system boundary makes it
N apps × 1 enforcement point.

**`href='#'` is the right fallback.** It renders as a clickable element
that does nothing (anchor jumps to top of page, but no script
execution, no exfiltration, no navigation to attacker-controlled
content). Consumers who need an unsafe URL have an explicit escape
hatch — pass `render={<a href={sanitized} />}` after their own
sanitization step.

**Browser-level mitigations exist but aren't enough.** Modern CSPs
(`script-src 'self'` etc.) block inline JavaScript URLs in many
contexts, but a design system can't assume the consumer's CSP, and
`data:` URLs still work for image/video rendering. Block at the
component layer.

## When to Apply

Apply to **every prop in the design system that accepts a URL string
from caller code**:

- `<Button href>`, `<IconButton href>`, `<Card href>`,
  `<Breadcrumb.Link href>`, `<Carousel.TitleLink href>`, `<Tabs.Tab href>`
- Any future `src={…}` prop on Image/Video components if the source
  can come from user input
- Any prop that ends up as `<form action={…}>`

Skip when the href is a literal in the component itself (e.g., a
`<Button href='/account'>` hardcoded in a layout) — the threat model
is user-controlled values, not constants.

## Examples

### Before — silent XSS path

```tsx
// CMS-driven link, value from JSON ↓
const url = collection.callToActionHref
return <Button href={url}>Get tickets</Button>
// If url === 'javascript:alert(document.cookie)':
// → <a href="javascript:alert(document.cookie)"> Get tickets </a>
// → click executes, cookies exfiltrated
```

### After — design-system boundary catches it

```tsx
const url = collection.callToActionHref
return <Button href={url}>Get tickets</Button>
// If url === 'javascript:alert(document.cookie)':
// → resolveLinkKind('javascript:alert(...)') → 'unsafe'
// → RoadieRoutedLink renders <a href="#"> with a dev warning
// → click is inert, console shows the rejected href in dev
```

### Escape hatch — for the rare legitimate case

```tsx
// If a consumer genuinely needs to render an unsafe protocol (e.g., a
// `data:` image URL inside a download anchor), they sanitize at the
// boundary themselves and pass `render` explicitly:
<Button render={<a href={sanitizedDataUrl} download='image.png' />}>
  Download
</Button>
```

The escape hatch is deliberately verbose so it shows up in code review.

## Related Solutions

- [Avoid the `use` prefix on pure helpers](./use-prefix-non-hook-forward-compat-hazard.md) —
  another design-system authoring lesson from the same Roadie review pass.
- [Cross-bundler dev-env check](../build-errors/cross-bundler-dev-env-check.md) —
  the `isDev()` guard used here for the dev-only warning is a
  cross-bundler-safe variant of `process.env.NODE_ENV`.

## Prevention

- **List dangerous protocols once, in one helper.** Don't scatter
  `if (href.startsWith('javascript:'))` checks across components — one
  central regex is testable and auditable.
- **Match case-insensitively and strip leading whitespace** before
  testing. `JavaScript:`, `\tjavascript:`, and `javascript:` are all
  the same threat.
- **Test the negative cases too.** `/javascript-tutorial` and
  `https://example.com/data:foo` must continue to classify correctly
  — false positives are also bugs.
- **Keep `'unsafe'` as a distinct kind, not a special case in
  `'internal'` / `'protocol'`.** Future contributors reading the type
  union see the security stance immediately.
- **Render `<a href='#'>` for unsafe, not `null` or omitted output.**
  Returning nothing changes layout; rendering an inert anchor
  preserves the visual without the threat.
