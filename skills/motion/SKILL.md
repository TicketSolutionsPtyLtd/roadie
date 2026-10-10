---
name: motion
description: Use when adding or changing an animation, transition, entrance, exit, loading state, attention cue, or any timing or easing in an app that uses Roadie (`@oztix/roadie-core` or `@oztix/roadie-components`). Use it in place of the generic motion-dev-animations skill there. Picks the Roadie component or utility for the job before any custom CSS, times custom motion with Roadie's duration and easing tokens only, and makes it respect reduced motion, including in JavaScript. Triggers on "animate", "animation", "transition", "fade in", "slide in", "entrance", "easing", "duration", "spring", "shake", "pulse", "skeleton", "spinner", "reduced motion".
---

# Roadie motion

Animate with Roadie's components, utilities, and tokens, so every Oztix app
moves with one timing and one feel. This skill holds the decisions agents get
wrong. The detail lives in two places:

- **The installed manifest,**
  `node_modules/@oztix/roadie-core/dist/roadie.manifest.json` (and the same
  file in `@oztix/roadie-components`). It lists every token, utility, and
  component prop, with links to the docs. Older releases don't ship it; read
  the package's CSS instead.
- **The Motion foundation,**
  [Motion](https://ticketsolutionsptyltd.github.io/roadie/foundations/motion/)
  (its markdown twin is the same URL with `.md`). Read it before any custom
  motion. [View transitions](https://ticketsolutionsptyltd.github.io/roadie/foundations/view-transitions/)
  covers route changes.

Never add an animation library (Motion, Framer Motion, GSAP, React Spring)
beside Roadie, and never write a raw duration, `cubic-bezier()`, or Tailwind's
numeric `duration-*` and `ease-in`/`ease-out` classes.

## 0. Check the setup

If any of this is missing, run `/roadie:setup` first.

- `@oztix/roadie-core` is installed, and the main CSS file imports
  `@oztix/roadie-core/css`. The motion tokens, utilities, and the reduced
  motion reset all come from it.
- Components come from their own subpaths, such as
  `@oztix/roadie-components/dialog`.

## 1. Let the component move

Most motion is already built in. Use the component, and add nothing.

| Job                         | Use                                                    |
| --------------------------- | ------------------------------------------------------ |
| A popover, menu, or tooltip | `Popover`, `Menu`, `Tooltip`: they use `motion-scale`  |
| A dialog                    | `Dialog`: it uses `motion-slide`                       |
| A side panel                | `Drawer`: it uses `motion-drawer`                      |
| A notification              | `Toast`: it uses `motion-toast`                        |
| Show and hide a section     | `Collapsible` or `Accordion`, never your own height    |
| Loading content             | `Skeleton` (`animate-shimmer`)                         |
| Work of unknown length      | `Progress` with no value (`animate-indeterminate`)     |
| Hover, press, and focus     | `is-interactive` on anything clickable, never your own |

## 2. Otherwise, use a utility

For motion no component gives you, pick the utility for the job.

| Job                                   | Utility                                                |
| ------------------------------------- | ------------------------------------------------------ |
| Something appears                     | `animate-fade-in`                                      |
| Something appears from a point        | `animate-scale-in`                                     |
| A card or panel arrives               | `animate-pop-in`, with an `origin-*` to grow from      |
| A popup of your own enters and leaves | `motion-scale` with `origin-[var(--transform-origin)]` |
| A surface of your own slides in       | `motion-slide`                                         |
| Content is pending                    | `animate-pulse-subtle`                                 |
| A wrong answer                        | `animate-shake`                                        |
| Look here                             | `animate-nudge`                                        |
| A count went up                       | `animate-pop`                                          |
| A tap landed                          | `animate-pop-tap`                                      |

- One-shot cues (`animate-shake`, `-nudge`, `-pop`, `-pop-tap`) replay when the
  class is removed and added again.
- `motion-fade-in`, `motion-fade-out`, `motion-scale-in`, `motion-scale-out`,
  and `motion-pop-in` are deprecated. Use the `animate-*` name, or
  `motion-scale` or `motion-slide` for an exit.
- Don't use Tailwind's `animate-spin`, `animate-pulse`, `animate-bounce`, or
  `animate-ping`. A spinner is `Progress`, and a pulse is
  `animate-pulse-subtle`.

## 3. Custom motion: tokens only

When nothing above fits, time it with the tokens. Read each one's job on the
Motion page.

- **Durations:** `duration-instant`, `duration-fastest`, `duration-fast`,
  `duration-normal`, `duration-moderate`, `duration-slow`, `duration-slower`,
  and `duration-slowest`, or `var(--duration-*)` in CSS. `--duration-ambient`
  and `--duration-sweep` are variables only, for loops.
- **Easings:** `ease-standard` for colour, opacity, and shadow; `ease-enter`
  for arrivals; `ease-exit` for departures; `ease-spring` and
  `ease-spring-lively` for transforms only. Only `ease-spring-lively` visibly
  overshoots.
- **Stagger:** delay each item by a multiple of `var(--stagger-base)`, and cap
  the list so the last item isn't late.
- Move `transform` and `opacity`. Never animate width, height, top, or left.
- Pass a consumer's class through `cn()`, so a later `animate-*`, `ease-*`, or
  `duration-*` replaces the component's.

## 4. Respect reduced motion

`@oztix/roadie-core/css` shortens every CSS animation and transition to almost
nothing and turns smooth scrolling off when the user asks for reduced motion.
It does not cover:

- **Delays.** A stagger still waits. Under reduced motion, drop the delay:
  `motion-reduce:[animation-delay:0s]`.
- **JavaScript.** `element.animate()`, `requestAnimationFrame` loops, and
  scroll-linked effects must check
  `matchMedia('(prefers-reduced-motion: reduce)').matches` and skip or jump to
  the end.
- **View transitions.** Wrap `::view-transition-*` rules in
  `@media (prefers-reduced-motion: no-preference)`.
- **Parallax and autoplay.** Put them behind `motion-safe:`, or leave them out.

Motion never carries meaning on its own. A shake also shows the error text, and
a loading state also says what's loading to assistive tech.

## 5. Before you hand off

- Grep your change for raw timing, and replace each hit with a token:
  `rg -n "[0-9]+m?s\b|cubic-bezier|duration-[0-9]|ease-(in|out|in-out)\b|animate-(spin|pulse|bounce|ping)\b" <files>`
- Turn on reduced motion (macOS: Accessibility, Display, Reduce motion) and
  check that nothing moves, no stagger waits, and nothing is lost.
- Run `/roadie:review`.
