---
name: setup
description: Use when adding Roadie to an app, or fixing an app where Roadie renders unstyled, links do full page loads, icons break hydration, or a compound loses its children. Installs the packages, adds the CSS imports, mounts RoadieProvider with the app's Link, and checks icon, server component, and dev origin rules. Use it instead of a generic Next.js skill for any app on @oztix/roadie-core or @oztix/roadie-components. Triggers on "set up Roadie", "install Roadie", "add Roadie to this app", "RoadieProvider", "Roadie styles missing".
---

# Roadie setup

Set Roadie up in an app, in order, then check it. Next.js App Router comes
first; Vite and Vue follow.

Don't copy facts that go stale. For exports, props, and deprecations, read
the installed manifest at
`node_modules/@oztix/roadie-components/dist/roadie.manifest.json` (and the
`@oztix/roadie-core` and `@oztix/roadie-charts` ones) when the installed
version ships one. For guides, or when there's no manifest, fetch
`https://ticketsolutionsptyltd.github.io/roadie/llms.txt`. For general Next.js
questions, read the docs in the installed `next` package
(`node_modules/next/dist/docs/`), not this skill.

## 1. Detect the framework and package manager

- **Framework.** `next` in `package.json` with an `app/` (or `src/app/`)
  folder is the App Router; follow every step. `vite` with `react` is Vite;
  see "Vite and React". `vue` is a Vue host; see "Vue".
- **Package manager.** The lockfile decides: `pnpm-lock.yaml`, `yarn.lock`,
  `bun.lock`, or `package-lock.json`. Use that tool for every install.
- **Tailwind CSS v4.** Roadie's CSS is Tailwind v4 source, so the app must
  compile it. `tailwindcss` 4 in `package.json`, wired in through
  `@tailwindcss/postcss` (in `postcss.config.*`), `@tailwindcss/turbopack` (in
  `next.config.*`), or `@tailwindcss/vite`, is enough. No Tailwind, or v3?
  Install `tailwindcss @tailwindcss/postcss postcss` and add the plugin:

  ```js
  // postcss.config.mjs
  export default { plugins: { '@tailwindcss/postcss': {} } }
  ```

## 2. Install the packages

```bash
pnpm add @oztix/roadie-core @oztix/roadie-components \
  @base-ui/react @ark-ui/react @phosphor-icons/react class-variance-authority
```

Swap `pnpm add` for the detected tool. The last four are peers, so install
them yourself. Components need `react` and `react-dom` 19.2 or later. Add `@oztix/roadie-charts` for charts, and
`@oztix/roadie-widgets` with its framework's peers for widgets (its README
lists them).

## 3. Add the CSS imports

In the global stylesheet (`app/globals.css` in Next), replace any
`@import 'tailwindcss'` with Roadie's imports. Core already imports Tailwind:

```css
@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
```

- Import every package's CSS you use: add `@oztix/roadie-charts/css` and
  `@oztix/roadie-widgets/css` too. Each registers only its own classes, so a
  missing one leaves those components unstyled.
- Never add `@source` paths into `node_modules`; the package CSS carries them.
- Remove the scaffold's own colour and font rules (such as `:root`
  `--background`, `body { background: … }`, and the `next/font` classes on
  `<html>`). Roadie's tokens set colour and type, and Tailwind's palette is
  off, so classes such as `bg-zinc-50` on scaffold pages do nothing.

Add the font preconnect hints to the root layout's `<head>`:

```tsx
<link rel='preconnect' href='https://assets.oztix.com.au' crossOrigin='' />
<link rel='preconnect' href='https://cdn.jsdelivr.net' crossOrigin='' />
```

## 4. Mount RoadieProvider

`RoadieProvider` routes every `href` through the app's router and sets up
theme, toasts, and tooltips. Put it in a client component, because a Link
component can't cross from the server:

```tsx
// app/providers.tsx
'use client'

import type { ReactNode } from 'react'

import NextLink from 'next/link'

import { RoadieProvider } from '@oztix/roadie-components'

export function Providers({ children }: { children: ReactNode }) {
  return <RoadieProvider link={NextLink}>{children}</RoadieProvider>
}
```

Wrap `{children}` with `<Providers>` in `app/layout.tsx`, and keep the layout
and pages server components. Mount it once, at the root. Its props (`theme`,
`toast`, `tooltip`, `direction`, `pendingIndicator`) take options, and `false`
leaves a part out. Replace any existing `RoadieLinkProvider`, `ThemeProvider`,
and `Toast.Provider` at the root with this one provider.

Then use `href` on any link-bearing component. Internal hrefs route through
`NextLink`, external ones open in a new tab, and no `href` renders a
`<button>`:

```tsx
import { Button } from '@oztix/roadie-components/button'

export function Cta() {
  return <Button href='/events'>Browse events</Button>
}
```

Import components from their own subpath (`@oztix/roadie-components/button`).
`RoadieProvider` and the other providers come from the package root.

## 5. Icons and server components

- **Icons.** Phosphor, `Icon`-suffixed names (`HeartIcon`, not `Heart`). In a
  server component (no `'use client'`), import from
  `@phosphor-icons/react/ssr`. Use `@phosphor-icons/react` only in files with
  `'use client'`; the plain import causes hydration errors on the server.
- **Compounds that walk their children.** Some compounds find their parts by
  element identity or walk their direct children, such as `Navigator` and
  `Carousel`. Author the whole tree (the root and every part inside it) in one
  client component, and pass server data in as props. From a server component
  the parts become client references, so items silently disappear.
  `Navigator.Primary` must be a direct child of `Navigator`, and
  `Carousel.Item`s direct children of `Carousel.Content`; a Fragment or your
  own wrapper component hides them.
- Other compounds, such as `Card`, `Field`, and `Pane`, render fine from
  server components with dot notation (`<Card.Content>`).

## 6. Dev origins

Next.js blocks cross-origin requests to dev-server resources from origins
not in `allowedDevOrigins`. If the dev server is opened from another device
(a phone on the same private network, or a tunnel), list those hosts in `allowedDevOrigins`, read from
`NEXT_DEV_ORIGINS` so no host is committed:

```ts
// next.config.ts: add the key to the existing config
const nextConfig: NextConfig = {
  allowedDevOrigins: (process.env.NEXT_DEV_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}
```

Then run `NEXT_DEV_ORIGINS=host-one,host-two pnpm dev`. Never commit real
hostnames or IPs.

## 7. Verify

- [ ] The build passes (`next build`, or the app's build script).
- [ ] A page renders `<Button href='/somewhere'>`: it's styled, it's an
      `<a>`, and clicking it navigates without a full page load.
- [ ] `<html>` gets the `dark` class when dark mode is on, and colours swap.
- [ ] No hydration warnings in the browser console.
- [ ] Every file without `'use client'` that imports Phosphor uses
      `@phosphor-icons/react/ssr`.
- [ ] `Navigator` and `Carousel` trees live in a `'use client'` file.
- [ ] One `RoadieProvider`, at the root.

## Vite and React

Same packages and CSS. Compile Tailwind v4 with the PostCSS plugin from the
first step. Import the stylesheet from the entry file, and wrap the app in
`RoadieProvider`. Without a `link` prop, internal hrefs render plain anchors.
To route through a client router, pass a component that takes `href` and
`children` and renders that router's link. Skip the server rules in step 5,
and step 6.

## Vue

`@oztix/roadie-components` is React only. A Vue app uses the core CSS and
utility classes:

```bash
pnpm add @oztix/roadie-core tailwindcss @tailwindcss/postcss postcss
```

Add the PostCSS plugin (step 1), `@import '@oztix/roadie-core/css';` in the
main stylesheet, and the font preconnect hints in `index.html`. For the Vue
widget skins, also install `@oztix/roadie-widgets` with
`vue motion @number-flow/vue @phosphor-icons/vue`, and add
`@oztix/roadie-widgets/css` after the core import. The Vue skins don't need
the components CSS. A host that can't run Tailwind v4 can use the prebuilt
`@oztix/roadie-core/css/compiled` for core utilities only.
