---
name: demo
description: Use before pushing any user-visible change (a component, page, style, or layout), in any Oztix repo. Starts a long-lived preview from the worktree, screenshots the changed pages at phone and desktop widths in light and dark, posts the Tailscale link and screenshots, and waits for the user's OK before the push. Reads the host repo's AGENTS.md and PR workflow. Triggers on "demo this", "show me", "preview the change", "screenshot it", "can I see it on my phone".
---

# Roadie demo

Show a UI change running before CI or a reviewer sees it. The user opens it on
their phone and says OK, and only then does the branch get pushed.

## 1. Gather

- The host repo's demo rule:
  `git ls-files | grep -iE 'agents.md|claude.md|pr_workflow'`. Roadie's is
  section 5 of `docs/contributing/PR_WORKFLOW.md`. It says which PRs skip the
  demo (in Roadie: tooling, CI, skills, and docs-text PRs) and who approves.
- Your session's port range, from the host workflow or your brief. Never
  serve outside it. Roadie's preview falls back to 3000 to 3099 when
  `ROADIE_PORT_RANGE` is unset, so always set it.
- The pages that show the change: the docs page, story, or app route, plus the
  index or catalogue tile if one changed.

## 2. Start the preview

Check the machine load first (`uptime`) and wait while the 1-minute load is
over the host's limit (in Roadie, PR workflow section 5). Then, from the worktree, in the background:

- With a `preview` script in `package.json`, run it with the port range set, for
  example `ROADIE_PORT_RANGE=3200-3299 pnpm preview`. Roadie's waits for load,
  builds what the docs read, serves on the first free port, and prints a
  `localhost`, a Tailscale (`http://<machine>.<tailnet>.ts.net:<port>/`), and
  LAN URLs. Add hosts with `NEXT_DEV_ORIGINS`.
- With no preview script, run the repo's dev script bound to `0.0.0.0` on a
  free port in your range, such as `next dev --hostname 0.0.0.0 --port <port>`
  or `vite --host --port <port>`. Allow the Tailscale name as a dev origin if
  the framework blocks unknown hosts, and build the URL from
  `tailscale status --json` (`Self.DNSName`).
- With no Tailscale, post the LAN URL and say the link only works on the same
  network.

Wait for the ready line (Roadie's starts `Preview ready` and names the pid),
then open the changed page once with `curl -sf` to
compile it before screenshots.

## 3. Screenshot

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
    await page.goto(url, { waitUntil: 'networkidle' })
    if (section) {
      // Works inside scroll containers, and wakes lazy content near it.
      await page
        .locator(section)
        .first()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.waitForLoadState('networkidle')
    }
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

Without Playwright, use a browser tool your session has (Chrome DevTools or
Playwright MCP: resize, emulate the colour scheme, screenshot). With none, post
the link and ask the user for the screenshots.

Look at every shot before posting. A blank page, an error overlay, or a wrong
theme means fix and retake, not post.

## 4. Post and wait

- In the chat, post the Tailscale link to the changed page, the four shots, and
  one line on what to look at.
- Wait for the user's OK before pushing UI changes, and work on something
  else meanwhile. Feedback means fix, retake, and post again. A standing
  approval (one the user gave, such as for overnight work, or one the host
  workflow grants; Roadie's rules on when to stop and ask are in PR workflow
  section 1) lets you push before the OK only on its terms. Push as a draft
  and mark the body "awaiting demo approval", and don't mark it ready until
  the OK.
- Once the PR exists, put the same link and shots under Evidence, at phone
  and desktop widths, light and dark (`/roadie:pr` writes the body). `gh`
  can't upload images. On a public repo, push them to a secret gist
  (`gh gist create` a placeholder, `gh gist clone` it, add the PNGs with a
  page or section prefix, push) and embed
  `https://gist.githubusercontent.com/<user>/<id>/raw/<file>.png`. On a
  private repo, a gist would make private UI public to anyone with the link,
  so give the local paths and ask the user to drag them in. Never commit
  screenshots to the repo. If the preview is stopped before the OK, say so
  and give the command that restarts it.

## 5. Stop

Stop the preview once the user approves or you finish the session: kill the
pid the preview printed (`kill <pid>`; Roadie's stops its whole process
group), or the dev server you started. Check the port is free
(`lsof -i :<port>`). If disk is low, `pnpm cleanup` lists stale `.next` caches
and merged worktrees, and `pnpm cleanup --delete` removes them.
