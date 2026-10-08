---
name: debug
description: Use when a test fails, flakes, or times out, CI is red, something behaves oddly, or a fix didn't stick. Reproduces first, checks the repo's recorded learnings, tests one hypothesis at a time, timeboxes, and ends with a docs/solutions entry or a check so the problem doesn't return. Works in any Oztix repo by reading its AGENTS.md and CODING_STANDARDS.md. Triggers on "debug this", "why is this failing", "flaky test", "CI timed out", "fix this bug".
---

# Roadie debug

Find the cause, fix it there, and leave something behind so nobody debugs it
twice. The host repo's `AGENTS.md` (or `CLAUDE.md`), `CODING_STANDARDS.md`,
and PR workflow win over anything here.

## 1. Look it up first

- Search the repo's learnings before reading code: `docs/solutions/`, or
  wherever `AGENTS.md` points. Match the symptom, module, engine, and error
  text (`grep -rli '<keyword>' docs/solutions`) and the frontmatter's
  `module`, `tags`, and `problem_type`.
- Read the `AGENTS.md` sections and `CODING_STANDARDS.md` rules for the area.
  A known rule often names the bug.
- Read the whole error and the code it names. For CI, read the failing job's
  log (`gh run view <id> --log-failed`), not just the title.

## 2. Reproduce

- **Smallest failing test first:** one file, one test (`-t '<name>'`),
  through the repo's load-gated runner, never `vitest` or the whole suite
  directly. In Roadie that's `pnpm test:gated <package> <file> -t '<name>'`;
  a repo without one follows its own load rule.
- **The right engine:** jsdom can't decide layout, `calc()`, or container
  queries. A browser bug needs the browser test, in the engine that failed. A
  CI-only failure may need CI's OS (a Linux container) or CI's load.
- **Measure, don't guess:** time it, count frames, log the value. For a
  CI-only timeout, compare CI's time for the file (in the log) with a local
  run of the same file. If every heavy file is many times slower, the runner
  is the cause, not the test.
- A flake that won't reproduce can often be forced: repeat it or shrink the
  timeout. Never load a shared machine to force it. With no reproduction, say so, and don't
  ship a fix you can't show failing without it.

## 3. One hypothesis at a time

- Write it in one sentence, with the result that would prove it wrong.
  Change one thing, rerun, and keep or drop it.
- Revert what didn't help before the next idea.
- Fix the cause: no retries, raised timeouts, sleeps, `!important`, or
  skipped hooks (`--no-verify`) to make it pass.
- If the cause is in CI config or a file another session or team owns, don't
  edit it. Hand the diff and evidence to its owner, or file it.

## 4. Timebox

Set a budget first: about 30 minutes or three hypotheses. When it runs out,
stop chasing and change approach.

- **Timing:** remove the timing assumption rather than chase the race. Wait
  for a positive signal, use fake timers past the exact delay, turn
  animations off, or give the work the resources it assumed. A test that
  sleeps and then asserts that nothing happened passes whether or not the
  work ran.
- **Otherwise:** bisect (`git bisect`, or delete half the test or
  component), read the library's source for its contract, or ask, listing
  what you've ruled out.

## 5. Leave something behind

- Keep the reproducing test: watch it fail with the bug present, then pass
  with the fix. It tests the public interface and waits for a state, not a
  time (`/roadie:test` has the rules). When the fix is to the tests
  themselves, break the behaviour each one guards and run it.
- The cheapest guard that stops it returning: a lint rule, a shared test
  helper, or a CI check. If it would widen the PR or touch files you don't
  own, file it as a follow-up.
- If no check can catch it, add or update a `docs/solutions/` entry in the
  repo's format (copy a sibling's frontmatter) with Symptom, Cause, and Fix.
- Put the root cause, what you ruled out, and the evidence in the PR body.
