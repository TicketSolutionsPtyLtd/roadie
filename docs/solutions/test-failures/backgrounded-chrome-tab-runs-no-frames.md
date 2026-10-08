---
title: A backgrounded Chrome tab runs no animation frames or observers
date: 2026-09-20
category: test-failures
problem_type: void_evidence
components:
  - docs
keywords:
  - chrome
  - requestAnimationFrame
  - ResizeObserver
  - IntersectionObserver
  - background tab
  - CDP
severity: medium
---

# A backgrounded Chrome tab runs no animation frames or observers

## Symptom

Probing a page through a Chrome extension or CDP, `requestAnimationFrame`
never ticks, `ResizeObserver` and `IntersectionObserver` never deliver, and
long `await` loops over frames time out. It looks as if a transition never
ran or state never changed.

## Root cause

Chrome suspends the rendering lifecycle of tabs it isn't painting. Frames and
observers hang off that lifecycle, so in a background tab they report
nothing, whatever the page does.

## Fix

- Prove the page renders before trusting an empty result: one
  `requestAnimationFrame` that resolves, or one observer firing for an element
  you know is visible.
- Use Playwright for anything timing-dependent. The extension is fine for DOM
  and computed-style reads.
- When a probe turns out void, retract every conclusion drawn from it, not
  just the headline.
- A screenshot or recording from the person who saw the bug outranks your own
  probe. Ask for one early.
