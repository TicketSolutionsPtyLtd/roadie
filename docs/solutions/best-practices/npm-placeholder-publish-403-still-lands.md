---
title: A placeholder publish that returns 403 can still land
date: 2026-10-23
category: best-practices
module: repo
tags: [npm, trusted-publishing, placeholder, bootstrap, dist-tag, release]
problem_type: best_practice
---

## Problem

Trusted publishing needs a package to exist before its publisher can be set,
so a new name starts with a placeholder published by hand. For
`@oztix/roadie-lint-plugin`, `npm publish` of `0.0.0-stage` printed
`E403 Forbidden - PUT`, yet the version was on npm. A retry under a new version
published a second placeholder, 0.0.1, and left both `latest` and `stage`
pointing at it. The editor's bootstrap showed the same 403.

Until the first real release, `npm i <pkg>` installs the placeholder, and the
`stage` tag stays on it afterwards.

## Fix

- After any publish error, run `npm view <pkg> versions dist-tags` before
  retrying. The version may already be there.
- Publish one placeholder, with `--tag stage`.
- After the first real release, remove the tag and deprecate the placeholders:
  `npm dist-tag rm <pkg> stage` and
  `npm deprecate <pkg>@"<first-real-version" "Placeholder"`.
- `/roadie:release` flags a stray tag or an undeprecated placeholder.
