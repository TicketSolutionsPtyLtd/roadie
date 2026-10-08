---
title: A Vue widget skin must spring values like its React sibling
date: 2026-08-20
category: component-patterns
problem_type: cross_framework_parity
components:
  - packages/widgets
keywords:
  - vue
  - motion
  - spring
  - cart-drawer
  - parity
severity: medium
---

# A Vue widget skin must spring values like its React sibling

## Symptom

The Vue cart drawer jumps where the React one eases. Surfaces derived from
`progress` flip between 0 and 1 on toggle while only the box animates, and in
some consumer builds the height transition doesn't run at all.

## Root cause

The React skin animates the value itself (`dragHeight`) with a `motion` spring
and derives `progress` from the animating value, so every derived surface
moves in step. The Vue skin set the value instantly and relied on a CSS
`transition` on `height`.

## Fix

- Import `animate` from `motion`, which works outside React, and spring the
  ref with the React skin's settings:

  ```ts
  animate(height.value, target, {
    type: 'spring',
    damping: 30,
    stiffness: 300,
    onUpdate: (v) => {
      height.value = v
    }
  })
  ```

  Stop the running animation on drag start, a new snap and unmount. Set the
  value directly under reduced motion. Keep `progress` computed from that ref.
  `motion` is a peer dependency, so list it in the skin's install docs. See
  `packages/widgets/src/cart-drawer/vue/useCartDrawerDrag.ts`.
- Remove the animated property from any CSS `transition` so it doesn't fight
  the spring. Transitions on radius, inset and opacity can stay.
- A collapsing flex column needs `flex-1 min-h-0` on a wrapper with no
  padding, and the scroll and padding on an inner `h-full` child. `flex-1` on
  a padded body floors it at the padding and clips its siblings.
- Test springs by polling until the value settles, not by asserting a value
  after one tick.

Compare both skins on the CartDrawer docs page's React and Vue tabs.
