---
title: Docs e2e page loads time out waiting on a CDN font or image
date: 2026-11-04
category: test-failures
module: docs
tags:
  [e2e, playwright, firefox, page-goto, load-event, fonts, cdn, network, flaky]
problem_type: test_failure
---

## Symptom

A docs e2e test fails now and then with
`page.goto: Timeout 30000ms exceeded … waiting until "load"`, on a page that
loads in about a second on other runs. Every test that shares the page fails
with it, such as all of `/foundations/colors` in `twin-data.e2e.test.ts`. Every
failure so far was in the Firefox shards, though CI loads the same pages in
Chromium, and a stalled request times out every engine the same way.

## Cause

`fonts.css` loads Intermission from `assets.oztix.com.au` and IBM Plex Mono
from `cdn.jsdelivr.net`, and docs examples show images from
`assets.oztix.com.au/image/`. `serveExport` used to route only
`http://docs.test`, so each page load in each test fetched those files from
the internet. The load event waits for every font and image in flight, so one
slow CDN response held `page.goto` past its 30 seconds. A test stalling those
requests reproduces it in Chromium, Firefox and WebKit.

## Fix

`serveExport` routes every other origin too (roadie#841):

- The stylesheets it serves have the CDN font URLs swapped for `data:` URIs
  of the same files: Intermission from `packages/core/src/fonts`, byte for
  byte the CDN's, and IBM Plex Mono from `docs/e2e/fonts`. A first version
  fulfilled the font requests through the route instead. Under CI load that
  answer came late enough for Firefox to cancel the request on a page that
  navigated, log "downloadable font: download failed", and fail a test that
  checks the console. Inlined, no font is ever requested.
- Any other image is `cart-demo-event.svg` from the export.
- Anything else is aborted, so a new network dependency fails at once rather
  than now and then.

`offline.e2e.test.ts` loads pages through a proxy that refuses every
connection. It checks that both fonts load without a request, and that CDN
images draw. When `fonts.css` changes a URL, add the new one to `FONTS` in
`serveExport.ts`, or that test fails.

The same PR sets `testTimeout: 60_000` in `vitest.e2e.config.ts`.
`home-grid.e2e.test.ts` was the one file left on Vitest's 5 second default,
and its first Firefox test, which also pays for the cold browser, took 5.1
seconds.
