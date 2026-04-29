---
title: Keep server-safe components server-safe by delegating to a `'use client'` sibling on demand
date: 2026-04-29
category: rsc-patterns
module: components
problem_type: best_practice
component: tooling
severity: medium
applies_when:
  - A server-safe component (no `'use client'` directive) needs to use behavior from a client-only context
  - The behavior is opt-in (only fires when a specific prop is passed) — not part of every render
  - Adding `'use client'` to the component would push every consumer's render into the client bundle
symptoms:
  - The component currently renders server-side, but a new feature requires reading React context
  - Adding `useContext` directly forces `'use client'` and breaks RSC dot-access for compound subcomponents
  - Tempted to ship a parallel "client variant" of the same component
root_cause: incorrect_logic
resolution_type: code_fix
related_components:
  - Card
  - Breadcrumb
tags:
  - rsc
  - server-components
  - use-client
  - client-delegation
  - boundary-preservation
  - nextjs
  - module-graph
---

# Keep server-safe components server-safe by delegating to a `'use client'` sibling on demand

## Context

Roadie's `RoadieLinkProvider` lives in a client module (it uses
`createContext` + `useContext`), but several link-bearing components
that need to read it — `Card`, `Breadcrumb.Link`, `Carousel.TitleLink`
— had been carefully kept server-safe so consumer apps could render
them in RSC trees without forcing the entire page into the client
bundle. Reading `useRoadieLink()` directly inside `CardRoot.tsx` would
require adding `'use client'` to that file, which:

1. Forces every server-rendered Card into a client component
2. Breaks the compound-export pattern (per
   [`compound-export-namespace.md`](./compound-export-namespace.md))
   if the directive landed in `index.tsx`
3. Increases the client JS bundle for every page that renders a Card,
   even Cards that don't need router awareness

The naive trade-off is "either ship two components (CardRoot +
ClientCardRoot) or accept the client-boundary regression." Neither is
right.

## Guidance

**Server-safe components delegate to a `'use client'` sibling
component, called only when the relevant prop is set.** The server-safe
file imports the client sibling — that import compiles to a
client-reference proxy in Next.js — but the runtime decision to
_render_ the client sibling is gated on a prop, so the boundary is
crossed only when needed.

```tsx
// CardRoot.tsx — STAYS SERVER-SAFE (no 'use client' directive)
import type { ComponentProps, ElementType } from 'react'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'

//      ↑ this is a 'use client' module — Next compiles the import as a
//        client-reference proxy. CardRoot.tsx itself stays server-safe
//        because it doesn't call any hook.

export function CardRoot({ as, href, render, ...props }: CardRootProps) {
  // No href, no render → render plain server-side <div>. Zero client JS.
  if (!as && href === undefined && render === undefined) {
    return <div data-slot='card' {...props} />
  }

  // href set → delegate to the client sibling.
  if (!as && href !== undefined) {
    return <RoadieRoutedLink href={href} {...props} />
    //     ↑ this is the only path that crosses to the client. Pages
    //       that never pass `href` to a Card never invoke the client
    //       proxy.
  }

  // …other branches…
}
```

The client sibling is the one that reads context:

```tsx
'use client'

import { useRoadieLink } from '../../providers/RoadieLinkProvider'

// RoadieRoutedLink.tsx is a 'use client' module (uses useContext).
export function RoadieRoutedLink({ href, ...rest }: RoadieRoutedLinkProps) {
  const Link = useRoadieLink() // ← context read happens here
  // …routing decision…
}
```

Verify the boundary held after a build:

```bash
# Server-safe — must NOT begin with "use client";
head -c 13 packages/components/dist/components/Card/CardRoot.js
# → "import{Roadie..."   ✓ no directive

# Client — MUST begin with "use client";
head -c 13 packages/components/dist/components/Link/RoadieRoutedLink.js
# → "\"use client\";"     ✓
```

## Why This Matters

**Importing a `'use client'` module from a server-safe file is fine —
Next handles the boundary at the module graph level.** The Roadie
docs site, every Next 14+ App Router app, and the `tsdown` unbundle
build all support this pattern. The server-safe file's emitted JS
contains a static import of the client module; Next replaces that
import with a client-reference proxy at the build/bundle layer. The
client component is invoked from React tree-render time, not from JS
import time, so the server module remains a pure server module.

**Cost is bounded and predictable.** When a page renders a Card with
`href` set, Next serializes the props as a client-reference payload
and ships the `RoadieRoutedLink.js` chunk to the browser — the same
cost as rendering the client component directly. When a page renders
a Card without `href`, the client chunk is registered as a reference
on the page's module graph but never rendered, so no JS executes for
it. The cost is **one client-reference proxy per Card-using page**,
not "every Card forces client rendering."

**The compound-export pattern still applies on top.** This delegation
trick lives at the leaf level (CardRoot is a leaf inside the
`packages/components/src/components/Card/` compound). The
`index.tsx` re-export layer must still be server-safe per
`compound-export-namespace.md` so dot-access (`<Card.Header>`) works
from server components. The two patterns compose: server-safe leaves
delegate to client siblings on demand; the server-safe `index.tsx`
re-exports both.

## When to Apply

Apply when **all four** are true:

1. The component is currently server-safe and you want to keep it that
   way.
2. The new functionality requires a hook (`useContext`, `useEffect`,
   `useState`, `useRef`, `useId`, etc.).
3. The new functionality is **opt-in** — gated on a prop or branch
   that consumers explicitly trigger. (If every render needs the hook,
   the component is fundamentally a client component and should be
   `'use client'`.)
4. The hook-using sibling is a small primitive — making it its own
   client module is a clean abstraction, not a hack.

Skip the delegation pattern when:

- The component already needs `'use client'` for other reasons (Base
  UI consumers like Button, Tabs.Tab — these read context via Base UI
  itself).
- The hook is required on every render. There's no opt-out, so the
  delegation buys nothing.
- The sibling component has nothing else worth being its own primitive.
  Don't invent a wrapper just to escape one `useContext` call.

## Examples

### Card with smart-href routing

`CardRoot.tsx` is server-safe; `RoadieRoutedLink.tsx` is client.
Server-rendered Cards without `href` ship zero client JS for the
routing logic. Server-rendered Cards with `href` cross to the client
exactly once per render, via the `RoadieRoutedLink` proxy.

### Breadcrumb.Link with smart-href routing

Same pattern: `BreadcrumbLink.tsx` is server-safe; the routing
delegate is `RoadieRoutedLink.tsx`. Verified via `head -c 13` on the
dist output.

### Counterexample — Button

`Button.tsx` already has `'use client'` because Base UI's
`<ButtonPrimitive>` requires it (Base UI uses hooks for focus
management, keyboard handling, etc.). Adding `useContext` for the
provider read inside Button is fine; no delegation needed.

## Related Solutions

- [Compound export namespace](./compound-export-namespace.md) — the
  server-safe `index.tsx` re-export layer that this pattern composes
  with.
- [Avoid the `use` prefix on pure helpers](../best-practices/use-prefix-non-hook-forward-compat-hazard.md)
  — the helper used inside `RoadieRoutedLink` (`resolveRender`) is
  intentionally not a hook, so it can be called from any path
  (conditional, loop, etc.) without rules-of-hooks fallout.

## Verification

For any component using this pattern, two checks should pass on
every build:

1. **Server-safe check** — the host file's dist output does NOT begin
   with `"use client";`:

   ```bash
   head -c 13 dist/components/Card/CardRoot.js
   # Expected: anything other than "use client";
   ```

2. **Client check** — the delegated sibling's dist output DOES begin
   with `"use client";`:

   ```bash
   head -c 13 dist/components/Link/RoadieRoutedLink.js
   # Expected: "use client";
   ```

3. **RSC smoke test** — render the host component (with both prop
   states) inside an RSC page (e.g., `/debug/rsc-smoke`) and confirm
   the build doesn't error and runtime output is correct.

If any of these fail, the boundary has regressed — the host file
likely picked up `'use client'` indirectly via a transitive hook
import.
