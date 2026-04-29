---
title: Element-form `render` prop drops decorative children when the consumer's element carries its own
date: 2026-04-29
category: build-errors
module: components
problem_type: build_error
component: tooling
severity: medium
symptoms:
  - A decorative element (icon, suffix, indicator) renders normally for default usage but disappears when the consumer passes a custom `render` element with children
  - Component default JSX `{children}{decorativeIcon}` becomes just `{consumerChildren}` after `cloneElement` merging
  - No error or warning fires — the element silently disappears
root_cause: incorrect_logic
resolution_type: code_fix
related_components:
  - Carousel
tags:
  - render-prop
  - cloneelement
  - mergeprops
  - children
  - polymorphism
  - resolveRender
---

# Element-form `render` prop drops decorative children when the consumer's element carries its own

## Problem

Roadie's `Carousel.TitleLink` decorates its anchor with a trailing
`ArrowRightIcon` ("→") to communicate "this is a link". When the
consumer passes an element-form `render` override that itself carries
children (`render={<NextLink>See all</NextLink>}`), the trailing arrow
silently disappears. The bug only surfaces when both the component
provides default children AND the consumer's render element provides
its own children — exactly the case that motivates the `render` prop
in the first place.

## Symptoms

```tsx
// Works as expected — arrow renders
<Carousel.TitleLink href='/events'>
  See events
</Carousel.TitleLink>
// → "See events →"

// Bug — arrow silently dropped
<Carousel.TitleLink render={<NextLink href='/events'>See events</NextLink>}>
  Events
</Carousel.TitleLink>
// → "See events"   (no arrow, no warning)
```

The text changes from "Events" to "See events" because the consumer's
render-element children win, but the decorative arrow that was supposed
to _follow_ the text is gone.

## What Didn't Work

- **Pass `children: innerChildren` (text + arrow) inside `defaultProps`**
  — this is what the original implementation did. `mergeProps` follows
  Base UI's "override wins for non-className/non-event keys" rule, so
  `renderProps.children` ("See events") wholesale replaces
  `defaultProps.children` (`{title}{arrow}`). Both the title text AND
  the arrow get dropped together.

- **Special-case `children` in `mergeProps`** (e.g., always concatenate
  defaults + override) — this would break the consumer's clear intent
  to _replace_ the title text. The decorative arrow is a separate
  concern from the title — they need separate handling.

- **Forbid render-element children entirely** — too restrictive.
  `<NextLink href='/x'>See all</NextLink>` is the natural way to
  override the title text.

## Solution

Build the rendered element via `resolveRender` first, then re-clone it
with `cloneElement` to **append** the decorative children alongside
whatever children survived the merge. The decorative bit is its own
JSX argument, not part of the prop bag.

```tsx
// CarouselTitleLink.tsx
const trailingIcon = (
  <ArrowRightIcon
    weight='bold'
    className='size-5 text-subtle transition-transform group-hover/title:translate-x-1'
  />
)

if (render !== undefined) {
  // Build the rendered element with the consumer's text as children.
  const baseElement = resolveRender(
    'a',
    {
      'data-slot': 'carousel-title-link',
      className: sharedClassName,
      ...(href !== undefined && { href }),
      ...(props as Record<string, unknown>),
      children                     // ← consumer-provided text or component default
    },
    render
  )

  // Re-clone to APPEND the decorative icon as a separate child. The
  // arrow always survives, regardless of how `render` resolved children.
  const baseProps = baseElement.props as { children?: React.ReactNode }
  return cloneElement(
    baseElement,
    undefined,                     // don't replace props
    baseProps.children,            // preserve whatever children resolved
    trailingIcon                   // append the decorative element
  )
}
```

The `as` (deprecated) and default-`<a>` paths use the same shape
inline, since they don't go through `resolveRender`:

```tsx
// Default + as paths render decorative children as JSX siblings
return (
  <a {...props}>
    {children}
    {trailingIcon}
  </a>
)
```

## Why This Works

`cloneElement(element, props, ...children)` accepts variadic children
arguments that **completely replace** the element's existing children.
By spreading the existing `baseProps.children` first and appending
`trailingIcon` second, the new children list is:

```
[<consumer or default text>, <ArrowRightIcon />]
```

React renders that as siblings inside the rendered element. The
consumer's render override controls the _prefix_ (the link text); the
component's decorative content is always _appended_ afterwards.

The key insight: **decorative content is a component-level concern,
not a prop**. Putting it in `defaultProps.children` makes it
overridable by `mergeProps`. Keeping it as a JSX child of a wrapping
`cloneElement` makes it inviolable.

## Prevention

- **Never put decorative content in `defaultProps.children`** when
  using a `mergeProps`-style override-wins helper. If the component
  always wants to render an icon/indicator/suffix, render it as a JSX
  sibling, not as a default-children prop.
- **Test element-form `render` with consumer-provided children**
  for any component that has decorative children of its own. The
  failing test takes seconds to write:
  ```ts
  it('preserves trailing arrow when render element has its own children', () => {
    const { getByText, container } = render(
      <Carousel.TitleLink render={<a href='/all'>See all</a>}>
        Events
      </Carousel.TitleLink>
    )
    expect(getByText('See all')).toBeInTheDocument()
    // ArrowRightIcon renders as <svg> — assert it's still there
    expect(container.querySelector('[data-slot="carousel-title-link"] svg'))
      .toBeInTheDocument()
  })
  ```
- **Document the children semantic in the helper** so future
  contributors don't reach for `defaultProps.children`:
  ```ts
  /**
   * `defaultProps.children` is merged with override-wins semantics.
   * If your component has decorative children that must always render,
   * append them via `cloneElement` after `resolveRender` returns.
   */
  ```
- **Watch for the same trap with `style`, `className`, and event
  handlers** — `mergeProps` handles those specially (concat for
  `className`, chain for `on*`, shallow-merge for `style`), but
  `children` is treated as a plain prop and follows the override-wins
  rule. Any other props that need "always-on" semantics need the same
  cloneElement-append treatment.

## Related Issues

- [Element-form `render` general guidance](./../best-practices/use-prefix-non-hook-forward-compat-hazard.md) — same component-library context, different lesson.
- The Roadie commit that fixed this: `ffc6ff4` — see CarouselTitleLink.tsx render-path branch.
