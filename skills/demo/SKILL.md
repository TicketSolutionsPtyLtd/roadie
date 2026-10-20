---
name: demo
description: Use before pushing any user-visible change (a component, page, style, or layout), in any Oztix repo. Starts a long-lived preview from the worktree, drives the changed UI (clicks, keyboard, overlays, edge content, and the console) and turns each bug it finds into a failing test before the fix, screenshots the changed pages at phone and desktop widths in light and dark, sends the preview link to the approver in the session, posts the screenshots, and waits for the approver's OK (the one the host workflow names) before the push. Reads the host repo's AGENTS.md and PR workflow. Triggers on "demo this", "show me", "preview the change", "screenshot it", "can I see it on my phone".
---

# Roadie demo

Show a UI change running, and use it, before CI or a reviewer sees it. The approver opens it on
their phone and says OK, and only then does the branch get pushed.

## 1. Gather

- The host repo's demo rule:
  `git ls-files | grep -iE 'agents.md|claude.md|pr_workflow'`. Roadie's is
  section 5 of `docs/contributing/PR_WORKFLOW.md`. It says which PRs skip the
  demo (in Roadie: tooling, CI, skills, and docs-text PRs) and who approves
  (in Roadie, the maintainer). Only that person's OK opens the push; a
  requester's or author's doesn't.
- Your session's port range, from the host workflow or your brief. Never
  serve outside it. Roadie's preview falls back to 3000 to 3099 when
  `ROADIE_PORT_RANGE` is unset, so always set it.
- The pages that show the change: the docs page, story, or app route, plus the
  index or catalogue tile if one changed.

## 2. Start the preview

Check the machine load first (`uptime`) and wait while the 1-minute load is
over the host's limit (in Roadie, PR workflow section 5). Then, from the worktree, in the background:

- With a `preview` script in `package.json`, read it first and pass a port in
  your range the way it accepts one. Roadie's reads `ROADIE_PORT_RANGE`
  (`ROADIE_PORT_RANGE=3200-3299 pnpm preview`); a plain `vite preview` ignores
  that and takes `--port <port> --strictPort`. Roadie's waits for load,
  builds what the docs read, serves on the first free port, and prints a
  `localhost`, a Tailscale (`http://<machine>.<tailnet>.ts.net:<port>/`), and
  LAN URLs. Add hosts with `NEXT_DEV_ORIGINS`.
- With no preview script, run the repo's dev script bound to `0.0.0.0` on a
  free port in your range, through the package manager so the local binary
  resolves: `pnpm exec next dev --hostname 0.0.0.0 --port <port>` or
  `pnpm exec vite --host --port <port> --strictPort` (`npx` in an npm repo). Allow the Tailscale name as a dev origin if
  the framework blocks unknown hosts, and build the URL from
  `tailscale status --json` (`Self.DNSName`).
- With no Tailscale, send the LAN URL and say the link only works on the same
  network. Preview links stay in the session (Roadie: PR workflow section 7).

Wait for the ready line (Roadie's starts `Preview ready` and names the pid),
check its URL's port is in your range (stop and restart if not), then open the changed page once with `curl -sf` to
compile it before screenshots.

## 3. Explore

Use the change in the preview before anyone sees a screenshot. The tests
check what someone thought of, and the screenshots show it at rest; this pass
looks for what neither did. A change with nothing to click still gets the
edge content and the console checks.

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

With Playwright, this script saved next to `shoot.mjs` records the console
and walks the tab order so you start from facts. Run
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
  await start.evaluate((el) => {
    el.focus()
    if (document.activeElement !== el) {
      el.setAttribute('tabindex', '-1')
      el.focus()
    }
  })
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
so look at the stop in a screenshot before calling it a bug. Scroll each
example into view and wait for it before you drive it: pages that render
examples lazily (Roadie's docs do) have nothing to click until then.

A lead is a bug only once you know what the change promised. Check it
against the docs page or spec, and the base branch, before writing a test:
clipped text inside a scroll container that fades its edges is the design,
and a key the pattern marks optional is a follow-up, not a fix.

**Every bug the pass finds becomes a failing test first**, then the fix
(`/roadie:test`): a `*.browser.test.tsx` when the browser or CSS decides it,
as focus rings, overlay placement, and clipping usually are, otherwise the
cheaper test that can fail (a keyboard path is a jsdom test with `userEvent`). Watch it fail on the bug, fix
it, watch it pass, and repeat the step that found it. Triage by the host's
rule (in Roadie: PR workflow section 7, where a Minor bug is fixed only if a
real user would hit it in normal use). A bug the base branch has too, or one
left unfixed, goes to the host's follow-up list (in Roadie: section 9), not
this PR.

Keep a note of each check: what you exercised, at which width and in which
engine, and what you didn't, with why (no touch device, no screen reader, an
engine not installed). It goes to the approver with the shots and into
Evidence.

## 4. Screenshot

Four shots per changed page: phone (390 by 844) and desktop (1440 by 900), each
in light and dark, scrolled to the part that changed. Use the headless browser
the repo already has, never a new dependency. With `playwright` installed
(Roadie's browser tests use it), save this inside the repo so `playwright`
resolves, at a gitignored path (Roadie ignores `.scratch/`), and run
`node .scratch/shoot.mjs <url> <out-dir> '<css selector>'` with an output folder
outside the repo:

```js
import { chromium } from 'playwright'

const [url, out, section] = process.argv.slice(2)
// Polling or streaming pages never go idle, so cap the wait instead of failing.
const settle = (page) =>
  page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
const sizes = { phone: [390, 844], desktop: [1440, 900] }
const browser = await chromium.launch()
for (const [size, [width, height]] of Object.entries(sizes)) {
  for (const mode of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
      colorScheme: mode
    })
    // Roadie's theme script reads a stored choice before the system setting.
    await context.addInitScript((m) => localStorage.setItem('theme', m), mode)
    const page = await context.newPage()
    await page.goto(url)
    await settle(page)
    if (section) {
      // Works inside scroll containers, and wakes lazy content near it.
      await page
        .locator(section)
        .first()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await settle(page)
    }
    // A resting pointer or leftover focus shows a hover or focus fill, which
    // reads as a colour change.
    await page.mouse.move(0, 0)
    await page.evaluate(() => document.activeElement?.blur?.())
    await page.screenshot({ path: `${out}/${size}-${mode}.png` })
    await context.close()
  }
}
await browser.close()
```

The shots are one screen each, not full page: apps that scroll an inner
container (Roadie's docs do) capture only the first screen with `fullPage`.
Pass a heading id (`'#states'`) or the changed element as the selector, and
run it again per section if one screen doesn't show the change, with a
separate output folder each time so the files don't overwrite each other.

Before each shot, move the pointer off interactive elements (to a neutral
corner, as the script does) and blur focus, so a hover or focus fill isn't
read as a colour change. When a hover, focus, or open state is the point,
drive it after that reset and name it in the file, for example
`button-hover-phone-light.png`.

Without Playwright, use a browser tool your session has (Chrome DevTools or
Playwright MCP: resize, emulate the colour scheme, screenshot). With none, send
the link in the session and ask the user for the screenshots.

Look at every shot before posting. A blank page, an error overlay, or a wrong
theme means fix and retake, not post. So does anything the host's privacy rule
keeps out of a public screenshot (Roadie: PR workflow section 7).

## 5. Post and wait

- In the session, send the approver the preview link to the changed page, the
  four shots, one line on what to look at, and the explore note: what the
  pass exercised, what it didn't, and each bug it found with its test.
- Wait for the approver's OK before pushing UI changes, and work on something
  else meanwhile. Feedback means fix, retake, and post again. A standing
  approval (one the approver gave, such as for overnight work, or one the host
  workflow grants; Roadie's rules on when to stop and ask are in PR workflow
  section 1) lets you push before the OK only on its terms. Push as a draft
  and mark the body "awaiting demo approval", and don't mark it ready until
  the OK.
- Once the PR exists, put the shots under Evidence as the host workflow says
  (Roadie: PR workflow section 7); `/roadie:pr` writes the body. `gh` can't
  upload images, so commit them alone to an orphan
  `<prefix>/<topic>-screenshots` branch, push it with `--no-verify` (the hooks
  can't run on an images-only branch), and embed each one with
  `https://github.com/<owner>/<repo>/blob/<branch>/<file>?raw=true`. If the
  preview is stopped before the OK, say so and give the command that restarts
  it.

## 6. Stop

Stop the preview once the approver says OK or you finish the session: kill the
pid the preview printed (`kill <pid>`; Roadie's stops its whole process
group), or the dev server you started. Check the port is free
(`lsof -i :<port>`). If disk is low, `pnpm cleanup` lists stale `.next` caches
and merged worktrees, and `pnpm cleanup --delete` removes them.
