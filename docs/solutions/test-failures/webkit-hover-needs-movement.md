---
title: A hover in headless WebKit doesn't highlight a Base UI item
date: 2026-10-20
category: test-failures
module: components
tags: [vitest, browser-mode, webkit, playwright, hover, pointer-events, base-ui]
problem_type: test_failure
---

## Symptom

A browser test hovers a Combobox or Autocomplete option with
`userEvent.hover` and expects `data-highlighted`. Chromium and Firefox pass;
WebKit never highlights the row. A test that then moves the pointer away
finds the highlight stuck where it was.

## Cause

Playwright's WebKit sends `pointermove` and `mousemove` with
`movementX` and `movementY` of 0, and Base UI ignores moves with no
movement. Without a pointer move Base UI also doesn't know a mouse is in
use, so leaving the item doesn't reset the highlight.

## Fix

Use `pointAt(element)` from `packages/components/src/utils/pointerTestUtils.ts`
(roadie#560) in place of `userEvent.hover` wherever a test needs Base UI to
see the pointer. It hovers, then dispatches a `pointermove` (with
`pointerType: 'mouse'`) and a `mousemove` that carry movement.

## Check

Run the test in WebKit:
`ROADIE_BROWSERS=webkit pnpm test:gated components <file> --project 'browser*'`.
