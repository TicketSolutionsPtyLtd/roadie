---
name: implement
description: Use when building a specced ticket or slice in any Oztix repo, after /roadie:spec and before /roadie:demo. Works in its own worktree on a correctly named branch, builds test-first at the spec's seams with /roadie:test, runs load-gated tests, wires new exports, rebuilds dist where docs or consumers read it, adds a changeset when a released package changes, then gates a user-visible change on an explore pass in the preview (clicks, keyboard, overlays, edge content, and the console, with each bug a failing test before the fix), and stops at the demo. Reads the host repo's AGENTS.md and CODING_STANDARDS.md. Triggers on "implement this", "build this ticket", "build the spec", "start on INNO-", "make the change".
---

# Roadie implement

Turn a spec into committed, tested, explored work, then hand it to the demo. It calls the
other skills rather than repeating them. Adapted from Matt Pocock's `implement`
skill (MIT). The host repo's `AGENTS.md` (or `CLAUDE.md`),
`CODING_STANDARDS.md`, and PR workflow win over anything here.

## 1. Start from the spec

- The spec: the ticket comment, the scratch file, or the draft PR body. With
  none, run `/roadie:spec` first. Where the host workflow wants intent agreed
  before code (in Roadie, new components and system-level APIs), wait for it.
- The host rules:
  `git ls-files | grep -iE 'agents.md|claude.md|coding_standards|pr_workflow'`.
  Note the branch and worktree rule, the wiring list, the load rule, and the
  changeset rule. With no workflow, use Roadie's sections 1, 2, and 5:
  `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/PR_WORKFLOW.md`.

## 2. Worktree and branch

Never edit, check out, or build in the main checkout. Make a worktree from the
latest base, on a branch named the way the host says, with the ticket key and
your session's branch prefix (Roadie: PR workflow sections 1 and 10, so a
phase 1 session uses `p1/inno-1234-short-slug`):

```bash
git fetch origin
git worktree add <path> -b <prefix>/<ticket>-<slug> origin/<base>
cd <path> && pnpm install --frozen-lockfile
```

In an npm repo (a `package-lock.json` and no `pnpm-lock.yaml`), install with
`npm ci` instead, and read `pnpm` below as `npm`.

Never touch another session's branches or worktrees. Already in a worktree on
the right branch? Carry on there. A session that can't create another worktree
(a sandbox confined to its own) works in the one it has: commit anything open
on the current branch, then `git switch -c <branch> origin/<base>` and install
again. Never `git stash`; the stash is shared by every worktree.

Stop every dev server you start, remove your scratch files by exact path
(never the shared scratchpad directory), and remove the worktree when the work
is done (Roadie: PR workflow section 1).

## 3. Build at the seams

- Each behaviour in the spec's test seams goes through `/roadie:test`: one
  failing test, just enough code, then the next.
- Skills, docs text, and config have no unit seam. Run the trial or check the
  spec names instead.
- A failure you can't explain goes to `/roadie:debug`, not a retry or a
  longer timeout.
- Make it work; leave polish and standards to `/roadie:review`.

## 4. Keep the machine cool

Check `uptime` before every install, build, test run, and preview, and wait
while the 1-minute load is over the host's limit (Roadie: PR workflow section
5). Roadie's pre-push hook waits for load itself; elsewhere check before every
push too. Run tests through the host's gated runner as `/roadie:test` says
(in Roadie, `pnpm test:gated`), never `vitest` or the whole suite directly.
The ready run in CI runs Chromium, plus WebKit and Firefox only with the
`full-browsers` label (Roadie: PR workflow sections 5 and 7), so before the
demo run the browser tests you touched in WebKit and Firefox locally (in
Roadie, `pnpm test:gated <package> <files> --all-browsers`).

## 5. Wire what's new

A new public export, utility, or component ships from every place the host's
wiring list names. Read the list each time rather than working from memory. In
Roadie it's `AGENTS.md` "Wiring something new" (exports, tsdown entries, the
safelist, and `cn()` groups), PR workflow section 2 (Size Limit budgets), and
section 4 (a new component's docs page and index tile).

## 6. Rebuild dist where it's read

Docs, browser tests, and other packages read built `dist`, not source. After
changing a package they read, check `uptime`, then rebuild it
(`pnpm --filter <package> build`) before running them. A "module not found" or
an old behaviour in the docs usually means stale `dist`.

## 7. Changeset

When a released package's shipped output changes, add a changeset per package
(`pnpm changeset`, or a file in `.changeset/`), written for consumers, with the
bump and held-release rules from the host workflow (Roadie: PR workflow
section 2). Released includes a private package Changesets versions, such as
Roadie's `roadie-skills` for `skills/`. Tests, docs, and internal tooling need
none; say why under the PR's Checks.

Before committing a changeset, a docs line, or a spec number, check each claim
against a test or a measurement: "wraps" when it truncates, "at every size"
when one size didn't change, and a row height that leaves out a border all
shipped that way.

## 8. Explore gate

Once the tests pass, use the change in a running preview. The tests check
what someone thought of, and the demo's screenshots show it at rest; this pass
looks for what neither did. It applies to user-visible changes, the scope of
the host's demo rule (in Roadie, tooling, CI, skills, and docs-text PRs skip
it), and it's a gate: the change doesn't go to the demo until every check has
run and every bug it found is fixed or ticketed. A change with nothing to
click still gets the edge content and the console checks.

Start the preview from the worktree as `/roadie:demo` step 2 says, in your
port range, and leave it running for the demo.

- **The changed interaction.** Click through every path the diff touches, at
  desktop width and at phone width with touch on (`hasTouch: true`),
  including states the page doesn't show by default (disabled, loading,
  invalid, selected).
- **Keyboard only.** Tab from above the change to past it, and Shift+Tab
  back. Focus follows reading order, every stop shows a visible focus ring,
  nothing hidden takes focus, and nothing traps it. Use the arrows, Home, End,
  Enter, and Space wherever the pattern uses them (in Roadie: the
  component's docs page, or the WAI-ARIA pattern it follows). Escape closes
  each overlay and returns focus to what opened it.
- **Overlays.** Open every menu, popover, select, tooltip, and dialog the
  change touches, at both widths. Each stays on screen, isn't clipped by a
  scroll container, sits above its neighbours, and closes on an outside
  click.
- **Edge content.** Long unbroken text, many items, one, and none (the empty
  state), plus zero and very large numbers where it shows data. Type into
  the page's own inputs, or swap text in the browser
  (`locator.evaluate((el) => (el.textContent = '…'))`); never commit test
  content to the page.
- **The console.** Errors, warnings, uncaught exceptions, and failed requests
  from load to the end of the pass. Open the same page on the base branch
  (in Roadie: the published docs site) for any you didn't expect: one that's
  there too isn't this change's, so note it rather than fix it here.

Drive it with the headless Playwright the repo already has, or a browser MCP
the session has (Playwright MCP: `browser_press_key`, `browser_snapshot`, and
`browser_console_messages`; Chrome DevTools: `press_key`, `take_snapshot`, and
`list_console_messages`). Never add a dependency. Run it in Chromium, and
repeat the keyboard and overlay checks in WebKit and Firefox for a focus or
layout change when the repo installs them (Roadie's browser tests do).

With Playwright, this script records the console and walks the tab order so
you start from facts. Save it inside the repo at a gitignored path, as `/roadie:demo`
step 3 does `shoot.mjs` (Roadie ignores `.scratch/`), and run
`node .scratch/explore.mjs <url> '<css selector>' [tab stops]`, then drive the
rest by hand from the same page, or in an MCP:

```js
import { chromium } from 'playwright'

const [url, section, stops = '40'] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const log = (...line) => console.log(...line)
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type()))
    log(`console.${m.type()}`, m.text())
})
page.on('pageerror', (e) => log('pageerror', e.message))
page.on('requestfailed', (r) => log('requestfailed', r.url()))
const settle = () =>
  page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
await page.goto(url)
await settle()
// Start the walk at the change, not the site header, once lazy content near
// it has rendered. A heading only takes focus with a tabindex.
if (section) {
  const start = page.locator(section).first()
  await start.evaluate((el) => el.scrollIntoView({ block: 'start' }))
  // The load state already resolved, so give lazy content time to mount.
  await page.waitForTimeout(1500)
  const focusable = await start.evaluate((el) => {
    el.focus()
    if (document.activeElement === el) return true
    el.setAttribute('tabindex', '-1')
    el.focus()
    return false
  })
  // Step back so the first Tab lands on the changed control itself.
  if (focusable) await page.keyboard.press('Shift+Tab')
}
for (let i = 0; i < Number(stops); i++) {
  await page.keyboard.press('Tab')
  const stop = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return 'body'
    // Utilities leave transparent shadows on everything, so a ring is
    // whatever changes when focus leaves. A transitioning ring still reads
    // as its start value, so turn transitions off while measuring.
    const instant = document.createElement('style')
    instant.textContent = '*, ::before, ::after { transition: none !important }'
    document.head.append(instant)
    const look = () =>
      [getComputedStyle(el), getComputedStyle(el, '::after')]
        .map((s) => [s.outline, s.boxShadow, s.borderColor, s.backgroundColor])
        .join()
    const focused = look()
    el.blur()
    const rest = look()
    el.focus()
    instant.remove()
    const label =
      el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40)
    const role = el.getAttribute('role') ?? el.tagName.toLowerCase()
    return `${role} "${label}" ${focused === rest ? 'NO RING' : 'ring'}`
  })
  log('tab', i + 1, stop)
}
await browser.close()
```

"NO RING" is a lead, not a verdict: a parent or sibling can draw the ring,
so look at the stop in a screenshot before calling it a bug. The walk blurs
and refocuses each stop, which closes an open overlay, so run it with
overlays closed and check them by hand. Scroll each example into view and
wait for it before you drive it: pages that render examples lazily (Roadie's
docs do) have nothing to click until then.

A lead is a bug only once you know what the change promised. Check it
against the docs page or spec, and the base branch, before writing a test:
clipped text inside a scroll container that fades its edges is the design,
and a key the pattern marks optional is a follow-up, not a fix.

**Every bug the pass finds becomes a failing test first**, then the fix
(`/roadie:test`): a `*.browser.test.tsx` when the browser or CSS decides it,
as focus rings, overlay placement, and clipping usually are, otherwise the
cheaper test that can fail (a keyboard path is a jsdom test with
`userEvent`). Watch it fail on the bug, fix it, watch it pass, and repeat the
step that found it, after rebuilding dist where the preview reads it (step 6;
in Roadie, the preview builds the packages only at start). Triage by the host's
rule (in Roadie: PR workflow section 7, where a Minor bug is fixed here when
it's in code this PR changes). A Minor bug in code this PR doesn't touch goes
to the host's follow-up list (in Roadie: section 9), not this PR.

Keep a note of each check: what you exercised, at which width and in which
engine, and what you didn't, with why (no touch device, no screen reader, an
engine not installed), and each bug it found with the test that now catches
it. It goes into the PR's Evidence (`/roadie:pr`).

## 9. Stop at the demo

Before handing off: typecheck and lint the touched packages, check
`git status --short` for stray screenshots or output before you stage, commit
with the ticket key, then check the branch's file list
(`git diff --name-only origin/<base>...HEAD`). Don't push yet.

Then `/roadie:review` in a fresh subagent, since the host wants a clean review
before anything is pushed (Roadie: PR workflow section 6).

- A user-visible change that passed the explore gate (step 8) then goes to
  `/roadie:demo`, which screenshots it in the same preview and waits for the
  OK before any push.
- Anything else ends with the spec's trial or check, and its result goes in
  Evidence.

Then `/roadie:pr` for the draft, and `/roadie:shepherd` to merge under the
host's merge rule. Report the branch, the tests and what each
proves, the runs you made, and anything you decided under Decisions.
