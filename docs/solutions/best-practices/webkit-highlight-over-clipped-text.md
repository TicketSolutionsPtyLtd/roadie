---
title: Only Chromium colours highlights over text-clipped ink
date: 2026-10-21
category: best-practices
module: core
tags: [css, webkit, safari, background-clip, selection, highlight, link]
problem_type: best_practice
---

## Problem

A `strong` Link draws its text while hovered or focused as background layers
clipped to the glyphs (`background-clip: text`), with
`-webkit-text-fill-color: transparent`, so each letter can change colour as
the fill sweeps across it. A highlight pseudo-element (`::selection`,
`::target-text`) on that text needs its own colours, because the browser's
highlight otherwise paints over the clipped ink and hides the letters.

Chromium and Firefox honour `background-color: Mark; color: MarkText;
-webkit-text-fill-color: MarkText` there, so highlighted letters read as
MarkText on Mark. WebKit doesn't: it blends the highlight background over the
clipped ink and ignores the highlight's text colour, so Mark gives yellow
letters on an olive box. Its own default highlight stays readable.

## Why no feature query detects it

The difference is in how each engine paints, not in what it parses. Every
engine supports `background-clip: text`, `-webkit-text-fill-color`, `Mark`,
`MarkText` and the highlight pseudo-elements, so `@supports` for any of them
is true everywhere.

## What we do

The Mark rules sit inside `@supports selector(::search-text)`, a feature only
Chromium ships, so the override is positive for the one engine known to paint
it correctly. Firefox and WebKit keep their own highlight, which stays
readable over the clipped ink. It's an engine sniff, used in two places:

- `packages/core/src/css/links.css`, on `link-strong`'s engaged
  `::selection` and `::target-text`.
- `packages/components/src/components/Link/Link.browser.test.tsx`, which
  skips the Mark pixel test and the Mark computed-style check where
  `CSS.supports('selector(::search-text)')` is false. The selection contrast
  test runs in every engine, since it checks what a reader sees.

The first gate, `@supports not (font: -apple-system-body)`, excluded WebKit
by a value only Apple's WebKit accepts. Linux WebKit (GTK and WPE, which
Playwright runs in CI) doesn't accept it, so it got the Mark override and the
yellow-on-olive highlight. A negative test for one engine misses its other
ports; a positive test for the engine that's verified doesn't.

## When to remove it

When WebKit or Firefox ships `::search-text`, check the strong example's
selection there: if it's MarkText on Mark, the gate can stay; if not, find
another Chromium-only feature. Remove the gate entirely once WebKit honours a
highlight pseudo-element's text colour over clipped text. Check with the Link
browser tests in each engine (`ROADIE_BROWSERS=webkit` and `firefox`) and, for
Linux WebKit, the CI run with the `full-browsers` label.
