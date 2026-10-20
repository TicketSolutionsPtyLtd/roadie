---
title: WebKit can't colour highlights over text-clipped ink
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

The difference is in how WebKit paints, not in what it parses. WebKit
supports `background-clip: text`, `-webkit-text-fill-color`, `Mark`,
`MarkText` and the highlight pseudo-elements, so `@supports` for any of
them is true in every engine.

## What we do

The Mark rules sit inside `@supports not (font: -apple-system-body)`, a value
only WebKit accepts, so WebKit keeps its own highlight. It's an engine sniff,
used in two places:

- `packages/core/src/css/links.css`, on `link-strong`'s engaged
  `::selection` and `::target-text`.
- `packages/components/src/components/Link/Link.browser.test.tsx`, which
  skips the Mark pixel test and the Mark computed-style check in WebKit with
  `CSS.supports('font', '-apple-system-body')`.

## When to remove it

When WebKit honours a highlight pseudo-element's text colour over clipped
text, or drops `-apple-system-body`, whichever comes first. Check by
removing the `@supports not` wrapper and running the Link browser tests with
`ROADIE_BROWSERS=webkit`: the selection contrast test and a manual selection
on the Link page's strong example should show dark MarkText on Mark.
