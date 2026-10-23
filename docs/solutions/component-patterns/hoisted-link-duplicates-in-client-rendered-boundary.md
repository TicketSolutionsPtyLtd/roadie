---
title: A hoisted head link doubles when its Suspense boundary client-renders
date: 2026-10-23
category: component-patterns
module: docs
tags: [react-19, hoisting, suspense, hydration, head, pane, e2e, flaky, ci]
problem_type: test_failure
---

## Symptom

CI failed "follows client navigation, updating or dropping the head link"
(`docs/e2e/markdown-twin.e2e.test.ts`) on its first poll, before any
navigation: `head link[type="text/markdown"]` resolved to two identical
`<link rel="alternate">` elements, and stayed at two. A rerun passed. The
exported HTML has one link, and an idle local machine never showed two.

## Cause

`AgentMenu` rendered the link inside `Pane.Header`, which sits inside the
Suspense boundary `PaneRoot` puts around the pane's children. When the
page's own client chunk arrives late, that boundary is still dehydrated when
the pane's context updates, so React gives up hydrating it and client-renders
it. React 19 claims a server-rendered hoistable `<link>` only while
hydrating. A client render creates a new one and appends it to the head, and
the server's copy stays, since it lives in the head, not in the boundary's
DOM.

Holding back only the colors page's chunk gave two links on every load.
Random delays of up to 1.5 seconds on every chunk gave two on 4 of 100.

## Fix

`DocsNavigator` renders the link above the pane, outside every Suspense
boundary, so it always hydrates and is claimed. It still updates on client
navigation and drops on a page with no twin. "keeps one head link when the
page's own code arrives late" holds the page's chunks until the navigator
shows its pending state, then checks for one link. It fails every run
without the fix.

Render a hoistable `<link>`, `<meta>`, or `<title>` outside any Suspense
boundary whose content can arrive late, or set it through Next metadata.
