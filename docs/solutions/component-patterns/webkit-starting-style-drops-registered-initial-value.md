---
title: WebKit 27.2 drops a registered property's initial value from a starting style
date: 2026-11-17
category: component-patterns
module: components
tags:
  [
    webkit,
    starting-style,
    at-property,
    custom-properties,
    transitions,
    pane,
    navigator
  ]
problem_type: browser_api_edge_case
---

## Problem

The pane test "a pane that mounts as the top > never slides in as the root it
arrives with" failed in WebKit, on every retry, once Playwright 1.65 brought
WebKit 27.2:

```
AssertionError: expected [ 'translate' ] to deeply equal []
```

A root pane that mounts into a row that is pushing must not slide in. It
didn't move, but WebKit started a `translate` transition on it, from `none`
to `0%`, for the length of the push.

## Cause

In WebKit 27.2, an element's starting style loses the initial value of a
registered custom property that doesn't inherit and that no rule sets. A
`var()` that reads it there is invalid, so the property using it falls back
to its own initial value.

`--pane-depth` is registered with `inherits: false` and `initial-value: 0`.
Rules set it for depths 1 to 3, and depth 0 relied on the initial value. A
pane's `translate` is a `calc()` over `--pane-depth`. So when a pushing row's
`@starting-style` rule matched a root pane, WebKit computed the starting
`translate` as `none`, the style after it as `0%`, and transitioned between
the two.

It reproduces without Roadie. This element transitions from `none` to `0%`
in WebKit 27.2, and doesn't transition in Chromium or Firefox:

```css
@property --depth {
  syntax: '<integer>';
  inherits: false;
  initial-value: 0;
}
.pane {
  transition: translate 1s;
  translate: calc(var(--depth) * 100%) 0;
}
@starting-style {
  .pane {
    --unrelated: 1;
  }
}
```

Any `@starting-style` rule that matches the element is enough, whatever it
sets. The transition doesn't start when the property inherits
(`inherits: true`), when a rule sets it on the element, or when the element
has no starting style rule.

## Fix

Set the property rather than rely on its registered initial value, on any
element a `@starting-style` rule can match:

```css
[data-slot='pane'][data-stack][data-depth='0'] {
  --pane-depth: 0;
}
```

The test that failed is the guard. It reads `getAnimations()` on the mounted
pane, so it fails in WebKit if the transition comes back.

## When adding a starting style

Before giving an element a `@starting-style` rule, list the registered
properties with `inherits: false` that its transitioned properties read
(`--pane-depth` here; core also registers `--raised-fill`, `--rim-light-own`,
`--intent-link-own`, and `--link-underline`), and set each on the element.
Then assert the element's `getAnimations()` in a browser test, in WebKit.
