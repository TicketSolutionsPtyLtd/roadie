---
title: A new package's placeholder needs a second publish
date: 2026-11-12
category: best-practices
module: repo
tags: [npm, trusted-publishing, placeholder, bootstrap, dist-tag, release]
problem_type: best_practice
---

## Problem

Trusted publishing needs a package to exist before its publisher can be set,
so a new name starts with a placeholder published by hand. The lint plugin,
editor, blocks, and illustrations each hit the 403 below and published a
second placeholder. Step 2 is what illustrations showed.

1. `npm publish --tag stage` of `0.0.0-stage` fails with
   `E403 Forbidden - PUT` and "You cannot publish using the version".
2. The package appears under the org's packages on npmjs.com, but
   `npm view <pkg>` and its package page return 404, and its settings page
   can't set a trusted publisher. For illustrations that lasted over 5
   minutes.
3. A second publish under a new version, such as `0.0.1-stage`, succeeds.
   Both versions then show on npm, with `latest` and `stage` on the second.

The 403'd version does land, but late. npm records illustrations'
`0.0.0-stage` about 7 minutes after its 403 and 78 seconds before
`0.0.1-stage`. In all four packages the first placeholder's time is 35 to 97
seconds before the second's, so it seems to land around the second publish,
not on a timer. Why is unknown.

Until the first real release, `npm i <pkg>` installs the placeholder, and the
`stage` tag stays on it afterwards.

## Fix

- Plan for two publishes. Publish `0.0.0-stage` with `--tag stage`, and when
  it fails with that 403, publish `0.0.1-stage` with `--tag stage`.
- To see whether a publish landed before `npm view` catches up, read the
  dist-tags: `curl https://registry.npmjs.org/-/package/<pkg>/dist-tags`.
- Set the trusted publisher once the package page loads: GitHub Actions,
  repository `TicketSolutionsPtyLtd/roadie`, workflow `release.yml`, and
  environment `production`.
- After the first real release, remove the tag and deprecate the placeholders:
  `npm dist-tag rm <pkg> stage` and
  `npm deprecate <pkg>@"<first-real-version" "Placeholder"`.
- `/roadie:release` flags a stray tag or an undeprecated placeholder.
