---
title: deploy-pages can't find an artifact uploaded a moment earlier in the same job
date: 2026-11-25
category: best-practices
module: ci
tags: [github-actions, github-pages, deploy-pages, artifacts, docs-deploy]
problem_type: bug
---

## Symptom

The Docs workflow built the site, uploaded it, then failed at "Deploy to
GitHub Pages":

```
Artifact github-pages successfully finalized. Artifact ID 14983248977
Fetching artifact metadata for "github-pages" in this workflow run
Found 0 artifact(s)
##[error]Fetching artifact metadata failed. Is githubstatus.com reporting issues …
##[error]Error: No artifacts named "github-pages" were found for this workflow run.
```

It failed on 10 of the main pushes on 24 and 25 November 2026, and other runs
of the same workflow passed. A new run of the same commit usually deployed.

## Cause

Upload and deploy were consecutive steps of one job. `deploy-pages` (v5.0.1)
looks the artifact up with a single `ListArtifacts` call and no retry, 0.3 to
0.8 seconds after `upload-pages-artifact` finalizes it. That list is
eventually consistent: under load it doesn't show the new artifact yet. The
passing runs had the same gap; they just got a list that had caught up. GitHub
tracks this as
[actions/deploy-pages#451](https://github.com/actions/deploy-pages/issues/451).

Ruled out:

- **Concurrency.** Run 45528662034 failed with no other Docs run in flight, so
  cancel-in-progress didn't replace or delete its artifact.
- **Version skew.** `upload-pages-artifact` v5.0.0 uploads with
  `upload-artifact` v4+, which `deploy-pages` v5 expects. The artifact ID and
  name in the upload log match what deploy looked for.
- **Name or retention.** Both default (`github-pages`, 1 day), and the lookup
  ran under a second after the upload.

## Fix

Deploy in its own job with `needs: build`, as GitHub's Pages starter workflows
do. Starting a second job takes seconds, not milliseconds, so the list has
caught up. A fixed `sleep` in the same job isn't enough on a busy day (see the
upstream issue). The deploy job also retries `deploy-pages` once, 30 seconds
later, if the first lookup still finds nothing. A failed lookup creates no
deployment, so the retry is safe.

Don't fix a failure by re-running only the deploy step in a same-job layout:
the re-run uploads a second `github-pages` artifact, and the lookup then fails
with "Multiple artifacts named github-pages". With the split, re-run the
failed deploy job alone; it reuses the build's single artifact.

The split also lets each job keep its own concurrency rule: the build cancels
when a newer push arrives, and a deploy in progress is never cancelled.

## Related

- `.github/workflows/docs.yml`
