---
title: Chromium's `interpolate-size` makes Base UI measure the old height of an element with a height transition
date: 2026-09-27
category: component-patterns
module: core
tags: [base-ui, interpolate-size, chromium, toast, popover, menu]
problem_type: bug
---

## Problem

`reset.css` sets `interpolate-size: allow-keywords` on `:root`, so `height`
can transition to and from `auto`. Some Base UI parts measure an element by
setting `height: auto` and reading `offsetHeight` straight back. If that
element has a height transition, Chromium starts a transition to `auto`
instead of jumping there, so the read returns the old height.

Toast hit this in #183: a toast whose content grew never got taller, because
Base UI's `ToastRoot` measured it at its previous height.

## Fix

Opt the element back out with `interpolate-size: numeric-only`. The
`motion-toast` utility in `packages/core/src/css/motion.css` does this.

## Where else it matters

Any Base UI `*.Viewport` part with a size transition. `Popover.Viewport` and
`Menu.Viewport` resize through Base UI's `usePopupAutoResize`, which sets the
popup's `--popup-width` and `--popup-height` to `auto` and reads the size back.
If a Roadie wrapper for either adds a `width` or `height` transition, add
`interpolate-size: numeric-only` to the popup with it. Neither is wrapped yet.

These are safe:

- **Collapsible and Accordion.** Base UI measures the panel's `scrollHeight`
  into `--collapsible-panel-height`. `scrollHeight` is the content's height,
  whatever height the panel is animating through.
- **Drawer.** The popup reads `offsetHeight` without setting `auto` first, and
  `motion-drawer` transitions only `transform` and `opacity`.
- **`CollapsibleText`.** It animates height itself and turns the transition
  off while it pins the start height, for the same reason.
