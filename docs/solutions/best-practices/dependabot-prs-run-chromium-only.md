---
title: Dependabot PRs test in Chromium only, so a dependency can break WebKit unseen
date: 2026-10-20
category: best-practices
module: repo
tags: [dependabot, ci, webkit, firefox, full-browsers, dependencies]
problem_type: best_practice
---

## Problem

A pull request runs browser tests in Chromium alone unless it carries the
`full-browsers` label, and Dependabot's grouped PRs carry no labels. A
grouped bump of `@tanstack/react-virtual` broke a Records test in WebKit
only, so the group's PRs were green. Only labelling roadie#588
`full-browsers` showed the failure, and the package was held at 3.14.13
([virtual-core-3-18-range-anchor-webkit.md](../test-failures/virtual-core-3-18-range-anchor-webkit.md)).

## Fix

Before merging a Dependabot PR, read its list of bumps. If any of them
renders, lays out, measures, scrolls, or handles input (Base UI, Floating
UI, TanStack Virtual, Embla, Tiptap, React, Tailwind, Lightning CSS), add
`full-browsers` and rerun CI so WebKit and Firefox run too:

```bash
gh pr edit <n> --add-label full-browsers
gh run rerun <run-id>
```

CI reads the label when the run starts, so a rerun of the whole run picks it
up; `--failed` doesn't.
