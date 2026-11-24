# 0015 Components animate with CSS and Web Animations

## Context

FileUpload and ImageCrop need springs, FLIP and rubber-banding (INNO-1614).
`motion` is a dependency of `@oztix/roadie-widgets` only, and every
component so far animates with CSS on the motion tokens.

## Decision

`@oztix/roadie-components` animates with CSS transitions and keyframes on the
motion tokens (`--duration-*`, `--ease-spring` and the rest), and with the Web
Animations API only where a value has to be measured first, as FLIP does. It
takes no animation library. A spring-back is a CSS transition from wherever
the gesture left the inline transform, so ImageCrop needs no Web Animations.

## Consequences

Reduced motion is handled once, by the global reset in `motion.css`, so a
component adds nothing for it; a Web Animation doesn't get the reset, so one
checks `prefers-reduced-motion` itself. Gesture maths, such as rubber-banding,
lives in core as pure functions with unit tests. A component that needs
physics a token spring can't give, such as momentum after a flick, reopens
this.

## Links

- INNO-1624, ImageCrop's controls and spring-back
- `packages/core/src/css/motion.css`
- `packages/core/src/image/crop.ts`, `rubberBand`
