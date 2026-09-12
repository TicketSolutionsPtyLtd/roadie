# Navigator section roots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A section chooses what its route shows — its generated list
(`root='list'`, today) or the page alone (`root='page'`) — and any page can
render a section's declared items in whatever layout it needs, through
`useNavigatorSection()` and `Navigator.SectionItems`; the docs site makes Home
a page-first section at `/` with the Get started pages under it.

**Architecture:** `Navigator.Secondary` gains `root`, which `findActiveSection`
copies onto the section data during Root's render walk, so the server render
already mounts the right panes and stack positions. `Navigator.Content` mounts
no generated pane and reveals nothing on a page-first section's own route; Back
and the `SecondaryPane` override follow the same predicate. The phone tab of a
page-first section pops to its root from a sub-page and scrolls to top on it.
Root's walk is generalised so the context carries the Primary's children (a
wrapped Primary publishes them after mount instead of publishing the section);
`useNavigatorSection` and `Navigator.SectionItems` derive a section's items
from that during render, and one internal `NavigatorSectionList` renders the
rows for both the list pane and `SectionItems`.

**Tech Stack:** React 19, TypeScript strict, Tailwind v4, Vitest + React
Testing Library (`renderToString` / `hydrateRoot` for SSR tests), Next.js 16
static-export docs, Playwright MCP for browser checks.

**Spec:** `docs/plans/2026-09-12-navigator-section-roots-design.md` (binding,
approved). Its parent is `docs/plans/2026-09-11-navigator-redesign-design.md`
§4; this spec supersedes that plan's D15. Read both in full.

## Global Constraints

Every task's requirements implicitly include this section.

- **Repo and branch.** `/Users/lukebrooker/Code/roadie`, branch
  `feat/navigator-component`, local only — never push, never touch `origin`.
- **Never run destructive git commands:** no `git checkout <rev> -- .`,
  `git reset --hard`, `git clean`, `git stash` (the user has stashes), rebase or
  branch deletion. To compare against an older commit, use `git show <rev>:<path>`
  or a throwaway worktree.
- **Staging:** `git add -u` plus explicit new/renamed/deleted file paths. Never
  `git add` a directory, `.` or `-A` — `docs/src/app/debug/pane-stack/` is the
  user's untracked file if present; never stage, edit or delete it.
- **Commit messages end with:**
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01J2XyGkf7FffFKRf9Ej334a
  ```
- **Names.** `Navigator.Primary` is one component in two orientations —
  `data-slot="navigator-primary"` + `data-orientation="vertical" | "horizontal"`;
  parts `navigator-primary-*`; variants `navigatorPrimary…`; CSS vars
  `--navigator-primary-*`; `group/primary`; surfaces `'vertical' | 'horizontal'`.
  **The retired desktop term (regex `(^|[^t])r[a]il`) appears nowhere** in
  anything written — code, identifiers, tests, comments, docs, changesets, this
  plan. Gate: `grep -rniE '(^|[^t])r[a]il' packages/components/src docs/src docs/contributing AGENTS.md .changeset --exclude-dir=node_modules --exclude-dir=dist` prints nothing.
- **Comments are minimal — ideally none.** One terse line only for what the
  code can't say (a quirk, a workaround, a non-obvious why). Public-prop JSDoc
  is one short sentence (the docs Props table reads it), plus `@default` where
  it applies. Never narrate, restate code, or mention plans, tasks, decisions
  or branches. This wins over any comment text in this plan's snippets — trim
  when copying. Trim narrating comments in the existing lines each task edits.
- **Literal unions on public props; no `VariantProps<…>['key']` on public
  props.** `root?: 'list' | 'page'` is written inline and also exported as
  `NavigatorSecondaryRoot`.
- **Dev warnings** are gated on `isDev()` from
  `packages/components/src/utils/isDev.ts` (`process.env.NODE_ENV` with a
  `typeof process` guard), and live in effects, never in render — React 19
  StrictMode double-invokes render.
- **Every rendered leaf carries a kebab-case `data-slot`.**
- **RSC identity walks.** `Primary`, `Secondary` and Root match
  `Navigator.Item`, `Navigator.Group`, `Navigator.GroupTitle`,
  `Navigator.Secondary`, `Navigator.Brand`, `Navigator.ExpandToggle`,
  `Navigator.Menu` by element type. Trees stay authored in a client component
  (`docs/contributing/COMPOUND_PATTERNS.md` §1.2); every new Navigator-tree
  file in the docs is `'use client'`.
- **React 19 ref-as-prop.** No `forwardRef`; `ref` is an ordinary prop.
- **SSR parity.** The server render and the first client render must match:
  everything a pane position, a Back link or a hook result depends on is
  computed during render from props and context, never from an effect, a ref
  or `location`. `NavigatorServerRender.test.tsx` is the gate — every new
  render-time fact gets a `renderToString` assertion and a `hydrateRoot` case
  with `onRecoverableError` and `console.error` both unfired.
- **Roadie never reads `location`.** Depth comes from `value` and `showList`,
  both derived by the app from its URL.
- **`Navigator` imports from `Pane`, never the reverse.**
- **Breakpoints, never conflated; no `matchMedia` in `packages/components/src`.**
  JS owns membership and depth; CSS owns which surface shows.
- **Only `translate` / `scale` / `opacity` animate.** This plan adds no motion.
- **Imports go at the top of files (merge duplicates).** Shared test helpers
  live in `packages/components/src/components/Navigator/testUtils.tsx`; every
  `Navigator.Primary` fixture includes `{testBrand}` from there, or Primary's
  no-brand warning fires and dirties stderr.
- **Tests:** `cd packages/components && pnpm vitest run <path>` (add `-t '<name>'`
  to narrow; the `pnpm --filter … test -- <file>` form does not filter).
  **Act-warning baseline is 0** for the whole suite, Navigator and Pane — keep
  it 0: `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane 2>&1 | grep -c "not wrapped in act"` prints `0`.
  Every test that renders a generated pane or a `Pane` must
  `await flushViewportMeasurement()`. Tests that assert pristine stderr
  (`vi.spyOn(console, 'error')`, `warn` spies asserting `not.toHaveBeenCalled`)
  must stay clean — a new dev warning that fires in an existing fixture is a
  defect in the fixture or the warning.
- **Prove every new assertion fails against the unfixed code** before
  implementing (the "run to verify it fails" steps are not optional).
- **`react-hooks/exhaustive-deps` is not registered** in `packages/components`
  — an `eslint-disable` for it is a lint error. `@typescript-eslint/no-unused-vars`
  ignores only *arguments* matching `^_`, not destructured rest siblings.
- **Prettier** on every `.ts`/`.tsx`/`.css` touched
  (`pnpm --filter @oztix/roadie-components exec prettier --write <files>` /
  `pnpm --filter docs exec prettier --write <files>`); **never run Prettier on
  `.mdx`** — edit by hand.
- **Docs are a static export** (`docs/next.config.mjs`: `output: 'export'`) —
  no `next/headers`. **Never run `pnpm --filter docs build`.** The docs resolve
  `@oztix/roadie-components` from `dist`: after changing `packages/components`,
  run `pnpm --filter @oztix/roadie-components build` before `pnpm typecheck`
  or the docs dev server sees the change.
- **Browser work** (Task 7 only): build the packages
  (`pnpm --filter @oztix/roadie-core build && pnpm --filter @oztix/roadie-components build`),
  then a docs dev server on port **9721** — but if one is already running
  (`lsof -iTCP -sTCP:LISTEN | grep node`; e.g. on 9614), reuse it and never
  kill it (Next refuses a second in the same folder). Start with
  `pnpm --filter docs exec next dev --port 9721`; stop it when done. Use the
  Playwright MCP tools; every probe reports `innerWidth` (an all-zero rect
  earlier in this project was the hidden surface). The Playwright browser is
  shared — open a fresh page.
- **Verification gate at every commit:**
  `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane`,
  then `pnpm --filter @oztix/roadie-components test`, `pnpm typecheck`,
  `pnpm lint` at the root. If CI's typecheck disagrees with local, delete every
  `tsbuildinfo` (`find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete`)
  and re-run.
- **Keep `pnpm typecheck` green at every commit.** Changing a context field
  means migrating every reader in the same task.
- **Implementers never dispatch subagents or reviewers.** If something is
  unclear, report NEEDS_CONTEXT with specifics instead of guessing.
- **Another agent is committing on this branch** (an RTL fix for the
  ExpandToggle, the Oztix `Logo` as the default `Navigator.Brand`). Before each
  task, `git status` and `git log -3`; build on what is there, never revert
  their hunks, and edit `.changeset/navigator-list.md` as it reads at that
  moment.

## Decisions recorded where the spec is ambiguous

- **S1 — The effective root is resolved once, in the walk.** `NavigatorActiveSection.root`
  is `'page'` only when the item has an `href` and its Secondary says
  `root='page'`; otherwise `'list'`. Spec §4: a routeless `root='page'` gets
  the existing routeless warning (`NavigatorPrimary.tsx`, "declares a
  Navigator.Secondary but no href") and is treated as `'list'`. No second
  warning.
- **S2 — "Where a list pane would show" is one predicate,** `listPaneShows`,
  computed in `Navigator.Content`: an active section, and not (page root and
  on the section route). The generated pane mounts, the root is revealed, the
  provisional positions are placed, `atRoot` is decided and Back is supplied
  from that one value, so the server render and the client can't disagree.
- **S3 — The context carries the Primary's children, not the section.**
  `sectionDerived`/`setActiveSection` become `primaryDerived`/`setPrimaryChildren`:
  Root reads a direct-child Primary's `children` during render, a wrapped
  Primary publishes its `children` from an effect, and `activeSection`, the
  hook and `SectionItems` all walk that one `primaryChildren`. One publication
  instead of two, and a `value` lookup works for a wrapped Primary after mount
  (spec §4 "falls back to the effect-published section after mount").
- **S4 — Tab tap on a page-first section.** In `selectDestination`
  (`NavigatorPrimary.tsx`): when the tapped tab owns the active section and
  that section's root is `'page'`, the `onShowListChange` toggle branch is
  skipped; on the section route the pane scrolls to top (the existing branch);
  on a sub-page the link (already the section route) is left to navigate and
  `setValue(tab.value)` is called, as an inactive tab would. `showList` still
  shows the list over a sub-page of either kind.
- **S5 — `NavigatorSectionData.icon` is the item's `icon` when it is a React
  element,** else `undefined` — `Navigator.Item.icon` is typed `ReactNode`, the
  spec's data shape says `ReactElement`.
- **S6 — The hook and `SectionItems` recompute every render.** The data is a
  fresh object each time (it's derived from props); nothing memoises it and the
  docs say so ("don't put it in effect deps; read fields").
- **S7 — Docs routes stay where they are.** The spec's example uses
  `/overview/installation`; the page lives at `/overview/getting-started` and
  keeps its route (links from `philosophy` and `vue-integration` point there).
  Its Home row is titled "Installation"; the page's own `metadata.title`
  ("Getting started") stays the header's concern, like the hardcoded Overview
  rows. Vue integration stays under Home (the spec lists Installation,
  Philosophy, Migration, Changelog and doesn't say to drop it; dropping it
  would orphan the page): Installation, Philosophy, Vue integration, Migrating
  to v2, Changelog.
- **S8 — The hero button.** It already links to the first Home sub-page; it is
  rewritten from `render={<Link href=…/>}` to `href='/overview/getting-started'`
  (the Linking convention) so the update is real and the button is the same
  target the Home cards lead with.

---

## File structure

**Created** (under `packages/components/src/components/Navigator/` unless noted)

| File | Responsibility |
| --- | --- |
| `sectionData.ts` | the public `NavigatorSectionData` / `Group` / `Item` types; `sectionRows` (rows with `onClick`, for rendering) and `toSectionData` (the hook's shape) |
| `useNavigatorSection.ts` | `useNavigatorSection(value?)` — client hook, computed during render |
| `useNavigatorSection.test.tsx` | hook shape, loose items, `current`, `value` lookup, unknown value, server render, wrapped Primary |
| `NavigatorSectionList.tsx` | internal: the rows as a `List`, shared by `SecondaryItems` (no descriptions, `query`) and `SectionItems` (descriptions) |
| `NavigatorSectionItems.tsx` | `Navigator.SectionItems` |
| `NavigatorSectionItems.test.tsx` | rows, descriptions, chevrons, `value`, unknown value; description absent from the navigation |
| `docs/src/components/HomeGuides.tsx` | docs: the Home section's items as `Card`s through the hook |

**Modified**

| File | Change |
| --- | --- |
| `NavigatorSecondary.tsx` | `root?: 'list' \| 'page'`; `NavigatorSecondaryRoot` type |
| `NavigatorContext.ts` | `NavigatorActiveSection.root`; `primaryChildren`, `setPrimaryChildren`, `primaryDerived` replace `setActiveSection`, `sectionDerived` |
| `activeSection.ts` | `findSection` generalised; `findActiveSection` sets `root`; `findSectionByValue` |
| `NavigatorRoot.tsx` | holds `primaryChildren`; derives `activeSection` from it |
| `NavigatorPrimary.tsx` | publishes `children` when wrapped; page-root tab-tap rule |
| `NavigatorContent.tsx` | `listPaneShows` drives the generated pane, reveal and `atRoot` |
| `NavigatorSecondaryPane.tsx` | renders nothing where no list pane would show |
| `NavigatorItem.tsx` | `description?: string` |
| `NavigatorSecondaryItems.tsx` | thin wrapper over `NavigatorSectionList` |
| `index.tsx`, `packages/components/src/index.tsx` | `Navigator.SectionItems`, `useNavigatorSection`, new types |
| `NavigatorSectionPane.test.tsx`, `NavigatorServerRender.test.tsx` | page-root cases |
| `docs/src/app/layout.tsx` | Home section at `/` with descriptions; Get started section gone |
| `docs/src/components/Navigation.tsx` | `'/'` icon, `root='page'`, `description` on rows |
| `docs/src/app/page.tsx` | `HomeGuides`; hero and CTA buttons use `href` |
| `docs/src/components/FooterNav.tsx` | `/` is a section route like any other |
| `docs/src/app/components/navigator/page.mdx` | Section roots section, guideline, hook and `SectionItems` examples; `/get-started` gone |
| `.changeset/navigator-list.md` | `root`, `description`, `useNavigatorSection`, `Navigator.SectionItems` |

**Deleted**

`docs/src/app/get-started/page.tsx` (the `/get-started` route).

---

## Task 1: `root` on `Navigator.Secondary` — panes, positions, Back and the override

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorSecondary.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorContext.ts:16-22`
- Modify: `packages/components/src/components/Navigator/activeSection.ts:21-38`
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx:111-128, 223-227`
- Modify: `packages/components/src/components/Navigator/NavigatorSecondaryPane.tsx`
- Modify: `packages/components/src/components/Navigator/index.tsx`, `packages/components/src/index.tsx` (export the type)
- Test: `packages/components/src/components/Navigator/NavigatorSectionPane.test.tsx`
- Test: `packages/components/src/components/Navigator/NavigatorServerRender.test.tsx`

**Interfaces:**
- Consumes: `findActiveSection(primaryChildren, value)` (`activeSection.ts`),
  `isActiveValue` (`NavigatorContext.ts`), `useTopPaneChrome({ atRoot })`,
  `provisionalPosition(entry, revealRoot)` (`paneStack.ts`) — all unchanged.
- Produces:

```ts
// NavigatorSecondary.tsx
export type NavigatorSecondaryRoot = 'list' | 'page'
export type NavigatorSecondaryProps = {
  'aria-label': string
  searchable?: boolean
  /** What the section route shows: the generated list, or the page alone. @default 'list' */
  root?: 'list' | 'page'
  className?: string
  children?: ReactNode
}

// NavigatorContext.ts
export type NavigatorActiveSection = {
  value: string
  href?: string
  label: ReactNode
  secondary: NavigatorSecondaryProps
  /** `'page'` only with an `href`; a routeless section is `'list'`. */
  root: NavigatorSecondaryRoot
}
```

Later tasks rely on `section.root` and on `Navigator.Content`'s
`listPaneShows` semantics (S2).

- [ ] **Step 1: Write the failing client tests**

Append to `NavigatorSectionPane.test.tsx` (after the `section routes`
describe; `Routed`, `panes`, `sectionPane`, `horizontal`, `backOf`, `testBrand`,
`flushViewportMeasurement`, `screen`, `within`, `vi` are already in scope there):

```tsx
function PageRooted({
  value,
  showList,
  onShowListChange,
  onValueChange,
  override = false
}: {
  value: string
  showList?: boolean
  onShowListChange?: (next: boolean) => void
  onValueChange?: (next: string) => void
  override?: boolean
}) {
  return (
    <Navigator
      value={value}
      showList={showList}
      onShowListChange={onShowListChange}
      onValueChange={onValueChange}
    >
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/' href='/'>
          Home
          <Navigator.Secondary aria-label='Home pages' root='page'>
            <Navigator.Item value='/overview/installation' href='/overview/installation'>
              Installation
            </Navigator.Item>
            <Navigator.Item value='/overview/philosophy' href='/overview/philosophy'>
              Philosophy
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/components' href='/components'>
          Components
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        {override ? (
          <Navigator.SecondaryPane value='/'>
            <p>Promo</p>
            <Navigator.SecondaryItems />
          </Navigator.SecondaryPane>
        ) : null}
        <Pane role='detail' current>
          <Pane.Header />
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('page roots', () => {
  it('mounts no list pane on the section route, where the page is the root with no Back', async () => {
    render(<PageRooted value='/' />)
    await flushViewportMeasurement()
    expect(sectionPane()).toBeNull()
    expect(panes()).toHaveLength(1)
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'top')
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  it('pushes a sub-page over the list, with Back to the section route', async () => {
    render(<PageRooted value='/overview/philosophy' />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'behind')
    const detail = panes()[1]!
    expect(detail).toHaveAttribute('data-stack-position', 'top')
    expect(backOf(detail)).toHaveAttribute('href', '/')
    expect(
      within(sectionPane()!).getByRole('link', { name: 'Philosophy' })
    ).toHaveAttribute('aria-current', 'page')
  })

  it('ignores showList on the root', async () => {
    render(<PageRooted value='/' showList />)
    await flushViewportMeasurement()
    expect(sectionPane()).toBeNull()
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'top')
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  it('still shows the list over a sub-page with showList', async () => {
    render(<PageRooted value='/overview/philosophy' showList />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
  })

  it('applies a SecondaryPane override only on sub-pages', async () => {
    const { rerender } = render(<PageRooted value='/' override />)
    await flushViewportMeasurement()
    expect(document.querySelector('[data-navigator-section]')).toBeNull()
    expect(screen.queryByText('Promo')).toBeNull()
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'top')
    rerender(<PageRooted value='/overview/installation' override />)
    await flushViewportMeasurement()
    expect(screen.getByText('Promo')).toBeInTheDocument()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'behind')
    expect(document.querySelectorAll('[data-navigator-section]')).toHaveLength(1)
  })

  it('treats a routeless page root as a list root', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/x'>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          <Navigator.Item value='/x'>
            X
            <Navigator.Secondary aria-label='X pages' root='page'>
              <Navigator.Item value='/x/one' href='/x/one'>
                One
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('its own route'))
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorSectionPane.test.tsx -t 'page roots'`
Expected: FAIL — typecheck error on `root` (vitest still runs: the first,
third and fifth tests fail because a list pane mounts on `/`).

- [ ] **Step 2: Write the failing server-render tests**

Append to `NavigatorServerRender.test.tsx` (its `serverRender`, `paneOf`,
`positions`, `testBrand`, `FakeIcon`, `flushViewportMeasurement` are in scope):

```tsx
function PageRootDocs({ value }: { value: string }) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/' href='/' icon={<FakeIcon />}>
          Home
          <Navigator.Secondary aria-label='Home pages' root='page'>
            <Navigator.Item value='/overview/philosophy' href='/overview/philosophy'>
              Philosophy
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          <Pane.Header />
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('Navigator server render of a page root', () => {
  it('renders no list pane on the root, where the page is top with no Back', () => {
    const container = serverRender(<PageRootDocs value='/' />)
    expect(positions(container)).toEqual([['detail', 'top']])
    expect(
      within(paneOf(container, 'detail')!).queryByLabelText('Back')
    ).toBeNull()
  })

  it('renders the list behind the page on a sub-page, with Back to the root', () => {
    const container = serverRender(
      <PageRootDocs value='/overview/philosophy' />
    )
    expect(positions(container)).toEqual([
      ['/', 'behind'],
      ['detail', 'top']
    ])
    expect(
      within(paneOf(container, 'detail')!).getByLabelText('Back')
    ).toHaveAttribute('href', '/')
  })

  it.each(['/', '/overview/philosophy'])(
    'hydrates %s without a mismatch or a position change',
    async (value) => {
      const ui = (
        <StrictMode>
          <PageRootDocs value={value} />
        </StrictMode>
      )
      const host = serverRender(ui)
      const before = positions(host)
      const error = vi.spyOn(console, 'error')
      const recoverable = vi.fn()
      let root: Root | null = null
      await act(async () => {
        root = hydrateRoot(host, ui, { onRecoverableError: recoverable })
      })
      await flushViewportMeasurement()
      expect(recoverable).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
      expect(positions(host)).toEqual(before)
      act(() => root?.unmount())
      vi.restoreAllMocks()
    }
  )
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorServerRender.test.tsx -t 'page root'`
Expected: FAIL — `positions` includes `['/', 'top']` on `/`.

- [ ] **Step 3: Add the prop and the resolved root**

`NavigatorSecondary.tsx` — add the type and prop:

```ts
export type NavigatorSecondaryRoot = 'list' | 'page'

export type NavigatorSecondaryProps = {
  /** Names the section's navigation landmark, e.g. 'Events pages'. */
  'aria-label': string
  /** Adds a search field to the section's pane that filters rows by label. */
  searchable?: boolean
  /** What the section route shows: the generated list, or the page alone. @default 'list' */
  root?: 'list' | 'page'
  className?: string
  children?: ReactNode
}
```

`NavigatorContext.ts` — import the type and extend the section:

```ts
import type {
  NavigatorSecondaryProps,
  NavigatorSecondaryRoot
} from './NavigatorSecondary'

export type NavigatorActiveSection = {
  value: string
  /** The section route; undefined only for a routeless section. */
  href?: string
  label: ReactNode
  secondary: NavigatorSecondaryProps
  /** `'page'` only with an `href`; a routeless section is `'list'`. */
  root: NavigatorSecondaryRoot
}
```

`activeSection.ts` — in `visitItem`, the assignment becomes:

```ts
    active ??= {
      value: itemProps.value,
      href: itemProps.href,
      label,
      secondary: declaration.props,
      root:
        itemProps.href !== undefined && declaration.props.root === 'page'
          ? 'page'
          : 'list'
    }
```

`index.tsx` — add `NavigatorSecondaryRoot` to the `NavigatorSecondary` type
export line; `packages/components/src/index.tsx` — add
`type NavigatorSecondaryRoot` to the Navigator export block.

- [ ] **Step 4: One predicate in `Navigator.Content`**

In `NavigatorContent.tsx`, replace lines 111-128 (`onSectionRoute` through
`const chrome = …`) with:

```ts
  const onSectionRoute =
    activeSection !== null && isActiveValue(activeSection.value, value)
  // A page-first section shows no list on its own route.
  const listPaneShows =
    activeSection !== null && !(activeSection.root === 'page' && onSectionRoute)
  const revealing =
    listPaneShows && !overflowOpen && (onSectionRoute || showList)
  const positions = useMemo(
    () => derivePositions(ordered, revealing),
    [ordered, revealing]
  )
  const topIndex = positions.indexOf('top')
  const topId = topIndex === -1 ? null : (ordered[topIndex]?.id ?? null)
  const rootIndex = useMemo(() => deriveRootIndex(ordered), [ordered])

  // Unregistered, as on the server: a list pane is the root, top only while revealed.
  const atRoot =
    ordered.length === 0 ? revealing || !listPaneShows : topIndex === rootIndex
  const chrome = useTopPaneChrome({ atRoot })
```

and the generated pane (lines 223-227) with:

```ts
  // Keyed so the search resets with the section; More replaces it while open.
  const sectionPane =
    listPaneShows && !overflowOpen && !overridden ? (
      <NavigatorSectionPane key={activeSection.value} section={activeSection} />
    ) : null
```

(`activeSection` narrows through `listPaneShows` only if TypeScript sees the
`!== null` — if it complains, write `listPaneShows && activeSection !== null && …`.)

- [ ] **Step 5: The override follows the same rule**

`NavigatorSecondaryPane.tsx` becomes:

```tsx
'use client'

import { use, useEffect } from 'react'

import { PaneRoot, type PaneRootProps } from '../Pane/PaneRoot'
import { PaneKindContext } from '../Pane/PaneStackContext'
import { NavigatorContext, isActiveValue } from './NavigatorContext'

export type NavigatorSecondaryPaneProps = Omit<
  PaneRootProps,
  'role' | 'current' | 'primaryNav' | 'id'
> & {
  /** The section whose generated pane this replaces. */
  value: string
}

/** Replaces one section's generated list pane; declare it before your detail pane. */
export function NavigatorSecondaryPane({
  value,
  ...props
}: NavigatorSecondaryPaneProps) {
  const {
    activeSection,
    overflowOpen,
    declareSecondaryPane,
    value: activeValue
  } = use(NavigatorContext)

  useEffect(() => declareSecondaryPane(value), [value, declareSecondaryPane])

  const onPageRoot =
    activeSection?.root === 'page' && isActiveValue(value, activeValue)
  if (activeSection?.value !== value || overflowOpen || onPageRoot) return null
  return (
    <PaneKindContext value='section'>
      <PaneRoot role='list' data-navigator-section={value} {...props} />
    </PaneKindContext>
  )
}

NavigatorSecondaryPane.displayName = 'Navigator.SecondaryPane'
```

- [ ] **Step 6: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorSectionPane.test.tsx src/components/Navigator/NavigatorServerRender.test.tsx`
Expected: PASS, including every pre-existing case, and
`… 2>&1 | grep -c "not wrapped in act"` prints `0`.

Then the gate: `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane && pnpm test`, then at the root `pnpm typecheck && pnpm lint`.

- [ ] **Step 7: Commit**

```bash
git add -u packages/components/src
git commit -m "feat(navigator): root='page' on Navigator.Secondary shows the page alone on the section route"
```

---

## Task 2: Tab-tap rules for a page-first section on phones

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx:315-355`
- Test: `packages/components/src/components/Navigator/NavigatorSectionPane.test.tsx`

**Interfaces:**
- Consumes: `NavigatorActiveSection.root` (Task 1); `scrollActivePaneToTop`,
  `setValue`, `onShowListChange`, `showList` from `NavigatorContext`; the
  `PaneRoot` viewport's `scrollTo` (registered through `registerScroller`) —
  the spec's "reuse the Pane scroll-to-top handler".
- Produces: nothing new — behaviour only (S4).

- [ ] **Step 1: Write the failing tests**

Append to `NavigatorSectionPane.test.tsx`, after the `page roots` describe
(`PageRooted` from Task 1, `horizontal`, `userEvent`, `vi` in scope). Add
`withStubLink` to the `./testUtils` import — the first test lets the tab's
link navigate, which jsdom would otherwise log to `console.error`:

```tsx
describe('page root tab', () => {
  const viewportScrollSpy = () => {
    const scrollTo = vi.fn()
    document.querySelector<HTMLElement>('[data-slot="pane-viewport"]')!.scrollTo =
      scrollTo
    return scrollTo
  }

  it('goes to the root from a sub-page, even with onShowListChange wired', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    const onValueChange = vi.fn()
    render(
      withStubLink(
        <PageRooted
          value='/overview/philosophy'
          onShowListChange={onShowListChange}
          onValueChange={onValueChange}
        />
      )
    )
    await flushViewportMeasurement()
    const home = within(horizontal()).getByRole('link', { name: 'Home' })
    expect(home).toHaveAttribute('href', '/')
    await user.click(home)
    expect(onShowListChange).not.toHaveBeenCalled()
    expect(onValueChange).toHaveBeenCalledWith('/')
  })

  it('scrolls the page to the top on the root', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    const onValueChange = vi.fn()
    render(
      <PageRooted
        value='/'
        onShowListChange={onShowListChange}
        onValueChange={onValueChange}
      />
    )
    await flushViewportMeasurement()
    const scrollTo = viewportScrollSpy()
    await user.click(within(horizontal()).getByRole('link', { name: 'Home' }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    expect(onShowListChange).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('still toggles the list for a list-first section', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    render(<Routed value='/components/a' onShowListChange={onShowListChange} />)
    await flushViewportMeasurement()
    await user.click(
      within(horizontal()).getByRole('link', { name: 'Components' })
    )
    expect(onShowListChange).toHaveBeenCalledWith(true)
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorSectionPane.test.tsx -t 'page root tab'`
Expected: the first test FAILS (`onShowListChange` was called with `true`);
the other two pass already.

- [ ] **Step 2: Implement**

In `NavigatorPrimary.tsx`, replace the body of `selectDestination` from
`const ownsSection = …` to the end of the function with:

```ts
    const ownsSection = activeSection?.value === tab.value
    const onSectionRoute = isActiveValue(tab.value, activeValue)
    // A page-first section's tab pops to its root; there is no list to toggle over it.
    const pageRoot = ownsSection && activeSection?.root === 'page'
    if (ownsSection && !pageRoot && onShowListChange && !onSectionRoute) {
      event.preventDefault()
      onShowListChange(!showList)
      return
    }
    if (ownsSection && onSectionRoute) {
      event.preventDefault()
      scrollActivePaneToTop()
      return
    }
    if (pageRoot) {
      setValue(tab.value)
      return
    }
    if (isActiveValue(tab.topValue, activeValue)) {
      event.preventDefault()
      scrollActivePaneToTop()
      return
    }
    if (tab.href === undefined) {
      event.preventDefault()
      setValue(tab.topValue)
    }
```

Also fix the comment above the function, which now reads: `// Without onShowListChange, a section tab's href already leads up to its route.` — keep it; it is still true.

- [ ] **Step 3: Run**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorSectionPane.test.tsx src/components/Navigator/Navigator.test.tsx -t 'tab'`
Expected: PASS (the `Navigator.test.tsx` "scrolls the pane to top … section
landing" and "navigates up to the landing" cases still pass).

Gate: `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane && pnpm test`; root `pnpm typecheck && pnpm lint`; act count `0`.

- [ ] **Step 4: Commit**

```bash
git add -u packages/components/src
git commit -m "feat(navigator): a page-first section's tab pops to its root, or scrolls it to the top"
```

---

## Task 3: `description` on `Navigator.Item`, the Primary's children in context, and `useNavigatorSection`

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorItem.tsx:35-52`
- Modify: `packages/components/src/components/Navigator/NavigatorContext.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorRoot.tsx:115-118, 155-178, 189-253`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx:75-101, 125-147`
- Modify: `packages/components/src/components/Navigator/activeSection.ts`
- Create: `packages/components/src/components/Navigator/sectionData.ts`
- Create: `packages/components/src/components/Navigator/useNavigatorSection.ts`
- Create: `packages/components/src/components/Navigator/useNavigatorSection.test.tsx`
- Modify: `packages/components/src/components/Navigator/index.tsx`, `packages/components/src/index.tsx`

**Interfaces:**
- Consumes: `NavigatorActiveSection` with `root` (Task 1); `secondaryBlocks`,
  `splitItemChildren` (`splitSecondary.ts`); `isActiveValue`, `isBranchActive`.
- Produces (Task 4, 5 and 6 use these exact names):

```ts
// NavigatorItem.tsx — added prop
/** Secondary text for `Navigator.SectionItems` and `useNavigatorSection`; the navigation never shows it. */
description?: string

// NavigatorContext.ts — replaces setActiveSection / sectionDerived
/** A direct-child Primary's children, or those a wrapped Primary published. */
primaryChildren: ReactNode
setPrimaryChildren: (next: ReactNode) => void
/** Root read the Primary's children during render, so Primary needn't publish them. */
primaryDerived: boolean

// activeSection.ts
export function findActiveSection(primaryChildren: ReactNode, value: string | undefined): NavigatorActiveSection | null
export function findSectionByValue(primaryChildren: ReactNode, itemValue: string): NavigatorActiveSection | null

// sectionData.ts
export type NavigatorSectionItem = {
  value: string
  label: ReactNode
  href?: string
  icon?: ReactElement
  description?: string
  badge?: ReactElement<BadgeProps>
  current: boolean
}
export type NavigatorSectionGroup = { title?: ReactNode; items: NavigatorSectionItem[] }
export type NavigatorSectionData = {
  value: string
  label: ReactNode
  href?: string
  groups: NavigatorSectionGroup[]
}
export type SectionRow = { item: NavigatorSectionItem; onClick?: () => void }
export type SectionRowGroup = { kind: 'group' | 'loose'; title?: ReactNode; rows: SectionRow[] }
export function sectionRows(section: NavigatorActiveSection, activeValue: string | undefined): SectionRowGroup[]
export function toSectionData(section: NavigatorActiveSection, activeValue: string | undefined): NavigatorSectionData

// useNavigatorSection.ts ('use client')
export function useNavigatorSection(value?: string): NavigatorSectionData | null
```

- [ ] **Step 1: Write the failing hook tests**

`useNavigatorSection.test.tsx`:

```tsx
import { type ReactNode, StrictMode } from 'react'

import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Navigator } from '.'
import { Badge } from '../Badge'
import { Pane } from '../Pane'
import { type NavigatorSectionData, useNavigatorSection } from './useNavigatorSection'
import { FakeIcon, flushViewportMeasurement, testBrand } from './testUtils'

const Wrapper = ({ children }: { children: ReactNode }) => <>{children}</>

const badge = <Badge>New</Badge>

function Probe({
  value,
  log
}: {
  value?: string
  log: (NavigatorSectionData | null)[]
}) {
  const data = useNavigatorSection(value)
  log.push(data)
  return (
    <span data-testid='probe'>
      {data === null
        ? 'none'
        : data.groups
            .flatMap((group) => group.items)
            .map((item) => `${item.value}${item.current ? '*' : ''}`)
            .join(' ')}
    </span>
  )
}

function Docs({
  value,
  probeValue,
  log,
  wrapPrimary = false
}: {
  value: string
  probeValue?: string
  log: (NavigatorSectionData | null)[]
  wrapPrimary?: boolean
}) {
  const primary = (
    <Navigator.Primary aria-label='Docs'>
      {testBrand}
      <Navigator.Item value='/' href='/' icon={<FakeIcon />}>
        Home
        <Navigator.Secondary aria-label='Home pages' root='page'>
          <Navigator.Item
            value='/overview/installation'
            href='/overview/installation'
            description='Set up the packages'
            icon={<FakeIcon />}
            badge={badge}
          >
            Installation
          </Navigator.Item>
          <Navigator.Item value='/overview/philosophy' href='/overview/philosophy'>
            Philosophy
          </Navigator.Item>
          <Navigator.Group>
            <Navigator.GroupTitle>Reference</Navigator.GroupTitle>
            <Navigator.Item value='/migration' href='/migration'>
              Migrating to v2
            </Navigator.Item>
          </Navigator.Group>
        </Navigator.Secondary>
      </Navigator.Item>
      <Navigator.Item value='/components' href='/components'>
        Components
        <Navigator.Secondary aria-label='Components'>
          <Navigator.Item value='/components/button' href='/components/button'>
            Button
          </Navigator.Item>
        </Navigator.Secondary>
      </Navigator.Item>
      <Navigator.Item value='/about' href='/about'>
        About
      </Navigator.Item>
    </Navigator.Primary>
  )
  return (
    <Navigator value={value}>
      {wrapPrimary ? <Wrapper>{primary}</Wrapper> : primary}
      <Navigator.Content>
        <Pane role='detail' current>
          <Probe value={probeValue} log={log} />
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('useNavigatorSection', () => {
  it('returns the active section: loose items as an untitled group, the current row marked', async () => {
    const log: (NavigatorSectionData | null)[] = []
    render(<Docs value='/overview/philosophy' log={log} />)
    await flushViewportMeasurement()
    const data = log.at(-1)!
    expect(data).toMatchObject({ value: '/', href: '/' })
    expect(data.label).toEqual(['Home'])
    expect(data.groups.map((group) => group.title)).toEqual([
      undefined,
      'Reference'
    ])
    expect(
      data.groups.map((group) => group.items.map((item) => item.value))
    ).toEqual([
      ['/overview/installation', '/overview/philosophy'],
      ['/migration']
    ])
    expect(data.groups[0]!.items.map((item) => item.current)).toEqual([
      false,
      true
    ])
  })

  it('carries label, href, icon, description and the badge element', async () => {
    const log: (NavigatorSectionData | null)[] = []
    render(<Docs value='/' log={log} />)
    await flushViewportMeasurement()
    const installation = log.at(-1)!.groups[0]!.items[0]!
    expect(installation).toMatchObject({
      value: '/overview/installation',
      href: '/overview/installation',
      description: 'Set up the packages',
      current: false
    })
    expect(installation.label).toEqual(['Installation'])
    expect(installation.icon?.type).toBe(FakeIcon)
    expect(installation.badge).toBe(badge)
    expect(log.at(-1)!.groups[0]!.items[1]!.description).toBeUndefined()
  })

  it('looks any section up by its item value', async () => {
    const log: (NavigatorSectionData | null)[] = []
    render(<Docs value='/' probeValue='/components' log={log} />)
    await flushViewportMeasurement()
    expect(log.at(-1)).toMatchObject({ value: '/components', href: '/components' })
    expect(screen.getByTestId('probe')).toHaveTextContent('/components/button')
  })

  it('returns null for an unknown value, an item without a Secondary, or outside every section', async () => {
    const log: (NavigatorSectionData | null)[] = []
    const { rerender } = render(
      <Docs value='/about' probeValue='/nowhere' log={log} />
    )
    await flushViewportMeasurement()
    expect(log.at(-1)).toBeNull()
    rerender(<Docs value='/about' probeValue='/about' log={log} />)
    expect(log.at(-1)).toBeNull()
    rerender(<Docs value='/about' log={log} />)
    expect(log.at(-1)).toBeNull()
  })

  it('is computed in the server render', () => {
    const log: (NavigatorSectionData | null)[] = []
    const html = renderToString(<Docs value='/overview/philosophy' log={log} />)
    expect(html).toContain('/overview/installation /overview/philosophy* /migration')
  })

  it('falls back to what a wrapped Primary publishes after mount', async () => {
    const log: (NavigatorSectionData | null)[] = []
    render(
      <StrictMode>
        <Docs value='/overview/philosophy' probeValue='/components' log={log} wrapPrimary />
      </StrictMode>
    )
    expect(log[0]).toBeNull()
    await act(async () => {
      await Promise.resolve()
    })
    await flushViewportMeasurement()
    expect(log.at(-1)).toMatchObject({ value: '/components' })
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/useNavigatorSection.test.tsx`
Expected: FAIL — `./useNavigatorSection` does not exist.

- [ ] **Step 2: `description` on the item**

`NavigatorItem.tsx` — add to `NavigatorItemProps` after `badge`:

```ts
  /** Secondary text for `Navigator.SectionItems` and `useNavigatorSection`; the navigation never shows it. */
  description?: string
```

`NavigatorItem` does not destructure it, so nothing renders it. (Task 4 pins
that with a test.)

- [ ] **Step 3: The walk finds any section**

`activeSection.ts` becomes:

```ts
import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement
} from 'react'

import { type NavigatorActiveSection, isBranchActive } from './NavigatorContext'
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorItem, type NavigatorItemProps } from './NavigatorItem'
import type { NavigatorSecondaryProps } from './NavigatorSecondary'
import { secondaryDescendantValues, splitItemChildren } from './splitSecondary'

type SectionMatch = (props: NavigatorItemProps, descendants: string[]) => boolean

function findSection(
  primaryChildren: ReactNode,
  matches: SectionMatch
): NavigatorActiveSection | null {
  let found: NavigatorActiveSection | null = null

  const visitItem = (child: ReactElement) => {
    const itemProps = child.props as NavigatorItemProps
    const { label, secondary } = splitItemChildren(itemProps.children)
    const [declaration] = secondary
    if (!isValidElement<NavigatorSecondaryProps>(declaration)) return
    if (!matches(itemProps, secondaryDescendantValues(secondary))) return
    found ??= {
      value: itemProps.value,
      href: itemProps.href,
      label,
      secondary: declaration.props,
      root:
        itemProps.href !== undefined && declaration.props.root === 'page'
          ? 'page'
          : 'list'
    }
  }

  Children.forEach(primaryChildren, (child) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorGroup) {
      const groupProps = child.props as { children?: ReactNode }
      Children.forEach(groupProps.children, (grandChild) => {
        if (isValidElement(grandChild) && grandChild.type === NavigatorItem) {
          visitItem(grandChild)
        }
      })
      return
    }
    if (child.type === NavigatorItem) visitItem(child)
  })

  return found
}

/** The branch-active item with a `Navigator.Secondary`, from Primary's children. */
export function findActiveSection(
  primaryChildren: ReactNode,
  value: string | undefined
): NavigatorActiveSection | null {
  return findSection(primaryChildren, (props, descendants) =>
    isBranchActive(props.value, descendants, value)
  )
}

/** The item with a `Navigator.Secondary` whose `value` is `itemValue`. */
export function findSectionByValue(
  primaryChildren: ReactNode,
  itemValue: string
): NavigatorActiveSection | null {
  return findSection(primaryChildren, (props) => props.value === itemValue)
}
```

- [ ] **Step 4: The context carries the Primary's children (S3)**

`NavigatorContext.ts` — in `NavigatorContextValue` replace

```ts
  /** The branch-active item's Secondary. Derived by Root; published by a wrapped Primary. */
  activeSection: NavigatorActiveSection | null
  setActiveSection: (next: NavigatorActiveSection | null) => void
  /** Root derived `activeSection` from a direct-child Primary, so Primary needn't publish it. */
  sectionDerived: boolean
```

with

```ts
  /** A direct-child Primary's children, or those a wrapped Primary published. */
  primaryChildren: ReactNode
  setPrimaryChildren: (next: ReactNode) => void
  /** Root read the Primary's children during render, so Primary needn't publish them. */
  primaryDerived: boolean
  /** The branch-active section, walked from `primaryChildren`. */
  activeSection: NavigatorActiveSection | null
```

and in the default value replace `setActiveSection: () => {}, sectionDerived: false,`
with `primaryChildren: null, setPrimaryChildren: () => {}, primaryDerived: false,`.

`NavigatorRoot.tsx`:

1. Replace the `publishedSection` state (lines 117-118) with
   `const [publishedChildren, setPrimaryChildrenState] = useState<ReactNode>(null)`
   and a stable setter that stores a node, not an updater:
   ```ts
   const setPrimaryChildren = useCallback(
     (next: ReactNode) => setPrimaryChildrenState(() => next),
     []
   )
   ```
2. Replace lines 169-178 (`derivedSection` … `activeSection`) with:
   ```ts
   // During render, not from Primary's effect, so the server renders the section's list pane.
   const primaryChildren =
     primary === undefined ? publishedChildren : primary.props.children
   const activeSection = useMemo(
     () => findActiveSection(primaryChildren, value),
     [primaryChildren, value]
   )
   ```
3. In `contextValue`, replace `setActiveSection,` and
   `sectionDerived: derivedSection !== undefined,` with
   `primaryChildren, setPrimaryChildren, primaryDerived: primary !== undefined,`;
   in its deps replace `derivedSection` with `primaryChildren, setPrimaryChildren, primary`.
4. Drop the now-unused `NavigatorActiveSection` import if TypeScript reports it.

`NavigatorPrimary.tsx`:

1. In the context destructure replace `setActiveSection, sectionDerived,` with
   `setPrimaryChildren, primaryDerived,`.
2. Replace the `wrappedSection` memo (lines 125-129) and its effect (145-147)
   with:
   ```ts
   // Root reads a direct child's children itself; only a wrapped Primary has to publish them.
   useEffect(() => {
     if (!primaryDerived) setPrimaryChildren(children)
   }, [primaryDerived, children, setPrimaryChildren])
   ```
3. Drop the `findActiveSection` import.

Then `grep -rn "sectionDerived\|setActiveSection" packages/components/src`
must print nothing.

- [ ] **Step 5: `sectionData.ts`**

```ts
import { type ReactElement, type ReactNode, isValidElement } from 'react'

import type { BadgeProps } from '../Badge'
import { type NavigatorActiveSection, isActiveValue } from './NavigatorContext'
import { secondaryBlocks, splitItemChildren } from './splitSecondary'

export type NavigatorSectionItem = {
  value: string
  label: ReactNode
  href?: string
  icon?: ReactElement
  description?: string
  badge?: ReactElement<BadgeProps>
  /** The item is the active `value`. */
  current: boolean
}

export type NavigatorSectionGroup = {
  /** The `Navigator.GroupTitle`; absent for loose items and untitled groups. */
  title?: ReactNode
  items: NavigatorSectionItem[]
}

export type NavigatorSectionData = {
  value: string
  label: ReactNode
  href?: string
  groups: NavigatorSectionGroup[]
}

export type SectionRow = { item: NavigatorSectionItem; onClick?: () => void }

export type SectionRowGroup = {
  kind: 'group' | 'loose'
  title?: ReactNode
  rows: SectionRow[]
}

/** The section's rows for rendering, with each item's `onClick`. */
export function sectionRows(
  section: NavigatorActiveSection,
  activeValue: string | undefined
): SectionRowGroup[] {
  return secondaryBlocks(section.secondary.children).map((block) => ({
    kind: block.kind,
    title: block.title ?? undefined,
    rows: block.items.map(({ props }) => ({
      item: {
        value: props.value,
        label: splitItemChildren(props.children).label,
        href: props.href,
        icon: isValidElement(props.icon) ? props.icon : undefined,
        description: props.description,
        badge: props.badge,
        current: isActiveValue(props.value, activeValue)
      },
      onClick: props.onClick
    }))
  }))
}

/** The shape `useNavigatorSection` returns. */
export function toSectionData(
  section: NavigatorActiveSection,
  activeValue: string | undefined
): NavigatorSectionData {
  return {
    value: section.value,
    label: section.label,
    href: section.href,
    groups: sectionRows(section, activeValue).map((group) => ({
      title: group.title,
      items: group.rows.map((row) => row.item)
    }))
  }
}
```

- [ ] **Step 6: The hook**

`useNavigatorSection.ts`:

```ts
'use client'

import { use } from 'react'

import { NavigatorContext } from './NavigatorContext'
import { findSectionByValue } from './activeSection'
import { type NavigatorSectionData, toSectionData } from './sectionData'

export type {
  NavigatorSectionData,
  NavigatorSectionGroup,
  NavigatorSectionItem
} from './sectionData'

/** A section's declared items — the active section's without a `value` — or null when none is found. */
export function useNavigatorSection(
  value?: string
): NavigatorSectionData | null {
  const {
    primaryChildren,
    activeSection,
    value: activeValue
  } = use(NavigatorContext)
  const section =
    value === undefined
      ? activeSection
      : findSectionByValue(primaryChildren, value)
  return section === null ? null : toSectionData(section, activeValue)
}
```

- [ ] **Step 7: Export**

`packages/components/src/components/Navigator/index.tsx` — after
`export { Navigator }` add:

```ts
export { useNavigatorSection } from './useNavigatorSection'
export type {
  NavigatorSectionData,
  NavigatorSectionGroup,
  NavigatorSectionItem
} from './sectionData'
```

`packages/components/src/index.tsx` — in the Navigator export block add
`useNavigatorSection,` after `Navigator,` and
`type NavigatorSectionData, type NavigatorSectionGroup, type NavigatorSectionItem,`
after `type NavigatorSecondaryRoot,`.

- [ ] **Step 8: Run**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/useNavigatorSection.test.tsx`
Expected: PASS.

Then `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane`
— every pre-existing test passes, including
`NavigatorServerRender.test.tsx` "Navigator with a wrapped Primary" and
`NavigatorSectionPane.test.tsx` "still suppresses the generated pane when
wrapped"; act count `0`. Then `pnpm test`, root `pnpm typecheck && pnpm lint`.

- [ ] **Step 9: Commit**

```bash
git add -u packages/components/src
git add packages/components/src/components/Navigator/sectionData.ts \
  packages/components/src/components/Navigator/useNavigatorSection.ts \
  packages/components/src/components/Navigator/useNavigatorSection.test.tsx
git commit -m "feat(navigator): useNavigatorSection and description, derived from the Primary's children"
```

---

## Task 4: `Navigator.SectionItems`, sharing the list pane's rows

**Files:**
- Create: `packages/components/src/components/Navigator/NavigatorSectionList.tsx`
- Create: `packages/components/src/components/Navigator/NavigatorSectionItems.tsx`
- Create: `packages/components/src/components/Navigator/NavigatorSectionItems.test.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorSecondaryItems.tsx`
- Modify: `packages/components/src/components/Navigator/index.tsx`, `packages/components/src/index.tsx`

**Interfaces:**
- Consumes: `sectionRows`, `SectionRow`, `SectionRowGroup` (Task 3);
  `findSectionByValue` (Task 3); `primaryChildren`, `activeSection`, `value`,
  `setValue` from `NavigatorContext`; `List`, `ListProps` (`../List`);
  `presentNavIcon`; `textOf`.
- Produces:

```ts
// NavigatorSectionList.tsx (internal)
export type NavigatorSectionListProps = Omit<ListProps, 'children'> & {
  section: NavigatorActiveSection
  query?: string
  descriptions?: boolean
  'data-slot': string
}
export function NavigatorSectionList(props: NavigatorSectionListProps): ReactElement

// NavigatorSectionItems.tsx
export type NavigatorSectionItemsProps = Omit<ListProps, 'children'> & {
  /** The section's item value; omit for the active section. */
  value?: string
}
export function NavigatorSectionItems(props: NavigatorSectionItemsProps): ReactElement | null
// data-slot='navigator-section-items'; Navigator.SectionItems = NavigatorSectionItems
```

`NavigatorSecondaryItems`' props and `data-slot='navigator-secondary-items'`
are unchanged; the "No matches" paragraph keeps `data-slot='navigator-secondary-empty'`.

- [ ] **Step 1: Write the failing tests**

`NavigatorSectionItems.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Navigator } from '.'
import { Badge } from '../Badge'
import { Pane } from '../Pane'
import { flushViewportMeasurement, primaryOf, testBrand } from './testUtils'

function Docs({
  value,
  itemsValue,
  withItems = true
}: {
  value: string
  itemsValue?: string
  withItems?: boolean
}) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/' href='/'>
          Home
          <Navigator.Secondary aria-label='Home pages' root='page'>
            <Navigator.Item
              value='/overview/installation'
              href='/overview/installation'
              description='Set up the packages'
              badge={<Badge>New</Badge>}
            >
              Installation
            </Navigator.Item>
            <Navigator.Group>
              <Navigator.GroupTitle>Reference</Navigator.GroupTitle>
              <Navigator.Item
                value='/migration'
                href='/migration'
                description='Move from v1'
              >
                Migrating to v2
              </Navigator.Item>
            </Navigator.Group>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Item
              value='/components/button'
              href='/components/button'
              description='Actions and CTAs'
            >
              Button
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          {withItems ? (
            <Navigator.SectionItems value={itemsValue} className='mt-2' />
          ) : null}
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

const sectionItems = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-section-items"]')

describe('Navigator.SectionItems', () => {
  it('renders the active section as grouped rows with descriptions, badges and chevrons', async () => {
    render(<Docs value='/' />)
    await flushViewportMeasurement()
    const list = sectionItems()!
    expect(list).toHaveClass('mt-2')
    expect(within(list).getByText('Reference')).toBeInTheDocument()
    expect(list.querySelectorAll('[data-slot="list-group"]')).toHaveLength(1)
    const installation = within(list).getByRole('link', { name: /Installation/ })
    expect(installation).toHaveAttribute('href', '/overview/installation')
    expect(
      installation.querySelector('[data-slot="list-item-subtitle"]')
    ).toHaveTextContent('Set up the packages')
    expect(installation.querySelector('[data-slot="list-item-chevron"]')).not.toBeNull()
    expect(installation).toHaveTextContent('New')
    expect(
      within(list).getByRole('link', { name: /Migrating to v2/ })
    ).toHaveTextContent('Move from v1')
  })

  it('marks the current row', async () => {
    render(<Docs value='/migration' />)
    await flushViewportMeasurement()
    expect(
      within(sectionItems()!).getByRole('link', { name: /Migrating to v2/ })
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(sectionItems()!).getByRole('link', { name: /Installation/ })
    ).not.toHaveAttribute('aria-current')
  })

  it('renders any section by value', async () => {
    render(<Docs value='/' itemsValue='/components' />)
    await flushViewportMeasurement()
    expect(
      within(sectionItems()!).getByRole('link', { name: /Button/ })
    ).toHaveTextContent('Actions and CTAs')
    expect(within(sectionItems()!).queryByText('Installation')).toBeNull()
  })

  it('renders nothing for an unknown section', async () => {
    render(<Docs value='/' itemsValue='/nowhere' />)
    await flushViewportMeasurement()
    expect(sectionItems()).toBeNull()
  })

  it('keeps description out of the navigation', async () => {
    render(<Docs value='/overview/installation' withItems={false} />)
    await flushViewportMeasurement()
    expect(screen.queryByText('Set up the packages')).toBeNull()
    expect(primaryOf('vertical')).not.toHaveTextContent('Set up the packages')
    expect(primaryOf('horizontal')).not.toHaveTextContent('Set up the packages')
    const pane = document.querySelector<HTMLElement>('[data-navigator-section]')!
    expect(within(pane).getByRole('link', { name: /Installation/ })).toBeInTheDocument()
    expect(pane.querySelector('[data-slot="list-item-subtitle"]')).toBeNull()
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorSectionItems.test.tsx`
Expected: FAIL — `Navigator.SectionItems` is undefined (the last test may
pass already; that is fine).

- [ ] **Step 2: The shared list**

`NavigatorSectionList.tsx`:

```tsx
'use client'

import { use } from 'react'

import { List, type ListProps } from '../List'
import { type NavigatorActiveSection, NavigatorContext } from './NavigatorContext'
import { presentNavIcon } from './presentNavIcon'
import { type SectionRow, sectionRows } from './sectionData'
import { textOf } from './splitSecondary'

export type NavigatorSectionListProps = Omit<ListProps, 'children'> & {
  section: NavigatorActiveSection
  /** Filters rows by label, case-insensitive. Groups left empty are hidden. */
  query?: string
  /** Show each item's `description` beneath its label. */
  descriptions?: boolean
  'data-slot': string
}

/** A section's rows as a `List`; the list pane and `Navigator.SectionItems` both render through it. */
export function NavigatorSectionList({
  section,
  query = '',
  descriptions = false,
  ...props
}: NavigatorSectionListProps) {
  const { value, setValue } = use(NavigatorContext)
  const needle = query.trim().toLowerCase()
  const groups = sectionRows(section, value)
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        ({ item }) =>
          needle === '' ||
          textOf(item.label).toLowerCase().includes(needle)
      )
    }))
    .filter((group) => group.rows.length > 0)

  if (groups.length === 0 && needle !== '') {
    return (
      <p
        data-slot='navigator-secondary-empty'
        className='px-4 py-3 text-sm text-subtle'
      >
        No matches
      </p>
    )
  }

  const row = ({ item, onClick }: SectionRow) => (
    <List.Item
      key={item.value}
      title={item.label}
      subtitle={descriptions ? item.description : undefined}
      leading={
        item.icon ? presentNavIcon(item.icon, 'size-5 text-subtle') : undefined
      }
      trailing={item.badge}
      href={item.href}
      current={item.current && 'page'}
      onClick={() => {
        setValue(item.value)
        onClick?.()
      }}
    />
  )

  return (
    <List {...props}>
      {groups.map((group, index) =>
        group.kind === 'loose' ? (
          group.rows.map(row)
        ) : (
          <List.Group key={`group-${index}`}>
            {group.title !== undefined ? (
              <List.GroupTitle>{group.title}</List.GroupTitle>
            ) : null}
            {group.rows.map(row)}
          </List.Group>
        )
      )}
    </List>
  )
}

NavigatorSectionList.displayName = 'NavigatorSectionList'
```

`NavigatorSecondaryItems.tsx` becomes:

```tsx
'use client'

import { use } from 'react'

import { NavigatorContext } from './NavigatorContext'
import { NavigatorSectionList } from './NavigatorSectionList'

export type NavigatorSecondaryItemsProps = {
  className?: string
  /** Filters rows by label, case-insensitive. Groups left empty are hidden. */
  query?: string
}

/** The active section's sub-pages as a `List`. */
export function NavigatorSecondaryItems({
  className,
  query
}: NavigatorSecondaryItemsProps) {
  const { activeSection } = use(NavigatorContext)
  if (activeSection === null) return null
  return (
    <NavigatorSectionList
      data-slot='navigator-secondary-items'
      section={activeSection}
      query={query}
      className={className}
    />
  )
}

NavigatorSecondaryItems.displayName = 'Navigator.SecondaryItems'
```

`NavigatorSectionItems.tsx`:

```tsx
'use client'

import { use } from 'react'

import type { ListProps } from '../List'
import { NavigatorContext } from './NavigatorContext'
import { NavigatorSectionList } from './NavigatorSectionList'
import { findSectionByValue } from './activeSection'

export type NavigatorSectionItemsProps = Omit<ListProps, 'children'> & {
  /** The section's item value; omit for the active section. */
  value?: string
}

/** A section's declared items as a `List`, descriptions included; renders nothing when the section isn't found. */
export function NavigatorSectionItems({
  value,
  ...props
}: NavigatorSectionItemsProps) {
  const { primaryChildren, activeSection } = use(NavigatorContext)
  const section =
    value === undefined
      ? activeSection
      : findSectionByValue(primaryChildren, value)
  if (section === null) return null
  return (
    <NavigatorSectionList
      data-slot='navigator-section-items'
      section={section}
      descriptions
      {...props}
    />
  )
}

NavigatorSectionItems.displayName = 'Navigator.SectionItems'
```

- [ ] **Step 3: Wire the compound**

`packages/components/src/components/Navigator/index.tsx`: import
`NavigatorSectionItems`, add `SectionItems: typeof NavigatorSectionItems` to
the type, `Navigator.SectionItems = NavigatorSectionItems` after
`Navigator.SecondaryItems = …`, and
`export type { NavigatorSectionItemsProps } from './NavigatorSectionItems'`.
(The docs Props table reads parts from these `Navigator.X =` assignments, so
`Navigator.SectionItems` appears there with no docs change.)

`packages/components/src/index.tsx`: add `type NavigatorSectionItemsProps,`
to the Navigator export block.

- [ ] **Step 4: Run**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorSectionItems.test.tsx src/components/Navigator/NavigatorSectionPane.test.tsx src/components/Navigator/NavigatorServerRender.test.tsx`
Expected: PASS — the list pane's rows (`generated section pane`,
`Navigator.SecondaryPane`, search) are unchanged.

Gate: `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane && pnpm test`; root `pnpm typecheck && pnpm lint`; act count `0`; the retired-term grep prints nothing.

- [ ] **Step 5: Commit**

```bash
git add -u packages/components/src
git add packages/components/src/components/Navigator/NavigatorSectionList.tsx \
  packages/components/src/components/Navigator/NavigatorSectionItems.tsx \
  packages/components/src/components/Navigator/NavigatorSectionItems.test.tsx
git commit -m "feat(navigator): Navigator.SectionItems renders a section's items with descriptions"
```

---

## Task 5: Docs site — Home is a page-first section at `/`

**Files:**
- Modify: `docs/src/app/layout.tsx:21-141`
- Modify: `docs/src/components/Navigation.tsx:56-83, 304-361`
- Modify: `docs/src/app/page.tsx:1-66, 365-386`
- Create: `docs/src/components/HomeGuides.tsx`
- Modify: `docs/src/components/FooterNav.tsx:22-25`
- Delete: `docs/src/app/get-started/page.tsx`

**Interfaces:**
- Consumes: `root='page'` on `Navigator.Secondary` (Task 1), `description`
  on `Navigator.Item` (Task 3), `useNavigatorSection` from
  `@oztix/roadie-components/navigator` (Task 3), `Card` with `href`
  (`@oztix/roadie-components/card`).
- Produces: `NavigationItem.description?: string` (layout → Navigation);
  the `'/'` section; `HomeGuides()`.

Run `pnpm --filter @oztix/roadie-components build` first — the docs typecheck
against `dist`.

- [ ] **Step 1: The Home section in `layout.tsx`**

Replace the `navigationItems` declaration and its Get started entry (lines
101-141) with:

```ts
  const migrationMetadata = await getMetadataFromFile(
    join(process.cwd(), 'src/app/migration/page.tsx'),
    'Migrating to v2'
  )

  const navigationItems: {
    title: string
    href: string
    items: {
      title: string
      href?: string
      label?: boolean
      description?: string
    }[]
  }[] = [
    {
      title: 'Home',
      href: '/',
      items: [
        {
          // The row says what the guide is for; the page's own title stays the header's.
          title: 'Installation',
          href: '/overview/getting-started',
          description: gettingStartedMetadata?.description
        },
        {
          title: philosophyMetadata?.title ?? 'Philosophy',
          href: '/overview/philosophy',
          description: philosophyMetadata?.description
        },
        {
          title: vueIntegrationMetadata?.title ?? 'Vue integration',
          href: '/overview/vue-integration',
          description: vueIntegrationMetadata?.description
        },
        {
          title: 'Migrating to v2',
          href: '/migration',
          description: migrationMetadata?.description
        },
        {
          title: 'Changelog',
          href: 'https://github.com/ticketsolutionsptyltd/roadie/blob/main/packages/components/CHANGELOG.md',
          description: 'Every release, on GitHub.'
        }
      ]
    }
  ]
```

`getMetadataFromFile` already reads `migration/page.tsx`'s metadata
(`METADATA_RE` matches the `export const metadata = {…}` in a `.tsx` too).

- [ ] **Step 2: `Navigation.tsx`**

1. `NavigationItem` gains `description?: string`.
2. `SECTION_ICONS`: replace `'/get-started': <HouseIcon />` with
   `'/': <HouseIcon />`.
3. In the section map, the generic `Navigator.Secondary` branch becomes:

```tsx
                ) : subItems.length > 0 ? (
                  <Navigator.Secondary
                    aria-label={`${section.title} pages`}
                    root={section.href === '/' ? 'page' : undefined}
                  >
                    {subItems.map((item) => (
                      <Navigator.Item
                        key={item.href ?? item.title}
                        value={item.href ?? item.title}
                        href={item.href}
                        description={item.description}
                      >
                        {item.title}
                      </Navigator.Item>
                    ))}
                  </Navigator.Secondary>
                ) : null}
```

(`subItems` already drops a row whose `href` equals the section's, so `/`
itself is never a row.)

- [ ] **Step 3: `HomeGuides.tsx`**

```tsx
'use client'

import { Card } from '@oztix/roadie-components/card'
import { useNavigatorSection } from '@oztix/roadie-components/navigator'

/** The Home section's pages as cards, read from the navigation so they are declared once. */
export function HomeGuides() {
  const section = useNavigatorSection('/')
  if (section === null) return null
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      {section.groups
        .flatMap((group) => group.items)
        .map((item) => (
          <Card
            key={item.value}
            href={item.href}
            className='grid h-full content-start gap-1 p-5 no-underline'
          >
            <h3 className='text-display-ui-6 text-strong'>{item.label}</h3>
            {item.description ? (
              <p className='text-sm text-subtle'>{item.description}</p>
            ) : null}
          </Card>
        ))}
    </div>
  )
}
```

- [ ] **Step 4: `page.tsx`**

1. Import `HomeGuides`: `import { HomeGuides } from '@/components/HomeGuides'`.
2. Hero buttons (lines 53-65) become:

```tsx
        <div className='flex gap-3'>
          <Button intent='accent' emphasis='strong' href='/overview/getting-started'>
            Get started
          </Button>
          <Button emphasis='normal' href='/components'>
            Browse components
            <ArrowRightIcon weight='bold' className='size-4' />
          </Button>
        </div>
```

3. Insert a section between the hero and Foundations:

```tsx
      {/* Get started */}
      <section className='grid gap-6'>
        <div className='grid gap-1'>
          <h2 className='text-display-ui-3 text-strong'>Get started</h2>
          <p className='text-subtle'>
            Install Roadie, learn the ideas behind it, and move from v1.
          </p>
        </div>
        <HomeGuides />
      </section>
```

4. The closing CTA button (lines 377-383) becomes
   `<Button intent='accent' emphasis='strong' href='/overview/getting-started'>Getting started guide</Button>`.
5. `Link` is still used by the `as={Link}` cards — keep the import.

- [ ] **Step 5: `FooterNav.tsx`**

Delete the line `if (pathname === '/') return null` (and the blank line after
it). `/` is a section route: it is no row, so `currentIndex` is `-1` and the
footer renders nothing — the same path as `/foundations`.

- [ ] **Step 6: Delete the route**

```bash
git rm docs/src/app/get-started/page.tsx
grep -rn "get-started'" docs/src --include='*.tsx' --include='*.ts'
```

Expected: the grep prints nothing (`/overview/getting-started` links are
different and stay; the `navigator/page.mdx` mentions are Task 6's).

- [ ] **Step 7: Verify**

```bash
pnpm --filter @oztix/roadie-components build
pnpm typecheck && pnpm lint
pnpm --filter docs exec prettier --write src/app/layout.tsx src/app/page.tsx src/components/Navigation.tsx src/components/HomeGuides.tsx src/components/FooterNav.tsx
```

Expected: green. Then a quick render check in the dev server (Global
Constraints — reuse a running one, else start on 9721): `/` shows the five Home
cards and no list pane; the phone bar (390 wide) reads Home, Foundations,
Components, More, plus the Appearance circle. The full browser pass is Task 7.

- [ ] **Step 8: Commit**

```bash
git add -u docs/src
git add docs/src/components/HomeGuides.tsx
git commit -m "docs: Home is a page-first section at /, with the Get started pages under it"
```

---

## Task 6: Navigator docs — "Section roots", the hook and `SectionItems`; changeset

**Files:**
- Modify: `docs/src/app/components/navigator/page.mdx` (by hand; no Prettier)
- Modify: `.changeset/navigator-list.md`

**Interfaces:**
- Consumes: everything public from Tasks 1-4. `tsx-live-noinline` blocks run
  with `CodePreview`'s scope — every export of `@oztix/roadie-components`
  (so `Navigator`, `useNavigatorSection`, `Card`, `List`, `Pane`), Phosphor
  icons with the `Icon` suffix, `DemoRouter`, `useState`.
- Produces: docs only.

- [ ] **Step 1: Retire `/get-started` in the existing examples**

In the Anatomy snippet (lines 37-39) replace the Get started item with:

```tsx
      <Navigator.Item value='/' href='/' icon={<HouseIcon />}>
        Home
        <Navigator.Secondary aria-label='Home pages' root='page'>…</Navigator.Secondary>
      </Navigator.Item>
```

In the "Section pane override" example replace `<Navigator.Brand href='/get-started' />`
with `<Navigator.Brand />` and the `/get-started` item with
`<Navigator.Item value='/' href='/' icon={<HouseIcon />}>Home</Navigator.Item>`.
Then `grep -n 'get-started' docs/src/app/components/navigator/page.mdx` prints nothing.

- [ ] **Step 2: Add the "Section roots" section**

Insert after the "Showing the list from the URL" section (before
"### Searchable"):

````md
### Section roots

A section's route shows its generated list by default. `root='page'` on
`Navigator.Secondary` shows the page alone there instead, full width at every
size — no list pane and no Back. Sub-pages behave the same in both kinds: a
list column beside the page from `lg`, the page on top with Back to the section
route when panes stack. On a phone, tapping a page-first section's tab on a
sub-page goes to its root, like iOS; on the root it scrolls the page to the top.
`showList` still shows the list over a sub-page, and is ignored on a page root.

Use a page root when the section has an overview worth reading — Home, a
dashboard. Use a list root when the section is a catalogue you pick from —
Components. A page root needs the section's `href`; without one the section
gets the routeless warning and behaves as a list root.

```tsx-live-noinline
function PageRootNav() {
  const titles = {
    '/': 'Home',
    '/overview/installation': 'Installation',
    '/overview/philosophy': 'Philosophy',
    '/components': 'Components'
  }
  return (
    <div className='h-[30rem] overflow-hidden rounded-2xl border border-subtle'>
      <DemoRouter initialPath='/'>
        {(path) => (
          <Navigator value={path} className='h-full'>
            <Navigator.Primary aria-label='Documentation'>
              <Navigator.Brand />
              <Navigator.Item value='/' href='/' icon={<HouseIcon />}>
                Home
                <Navigator.Secondary aria-label='Home pages' root='page'>
                  <Navigator.Item
                    value='/overview/installation'
                    href='/overview/installation'
                    description='Install the packages and wire up the CSS.'
                  >
                    Installation
                  </Navigator.Item>
                  <Navigator.Item
                    value='/overview/philosophy'
                    href='/overview/philosophy'
                    description='The goals and the mental model.'
                  >
                    Philosophy
                  </Navigator.Item>
                </Navigator.Secondary>
              </Navigator.Item>
              <Navigator.Item value='/components' href='/components' icon={<CubeIcon />}>
                Components
              </Navigator.Item>
            </Navigator.Primary>
            <Navigator.Content>
              <Pane role='detail' current>
                <Pane.Header>
                  <Pane.Title>{titles[path]}</Pane.Title>
                </Pane.Header>
                {path === '/' ? (
                  <div className='grid gap-3 pb-4'>
                    <p className='px-4 text-subtle'>
                      The root shows the page alone. Its items, declared once in the
                      navigation, render here through Navigator.SectionItems.
                    </p>
                    <Navigator.SectionItems />
                  </div>
                ) : (
                  <p className='px-4 pb-4 text-subtle'>The page at {path}.</p>
                )}
              </Pane>
            </Navigator.Content>
          </Navigator>
        )}
      </DemoRouter>
    </div>
  )
}
render(<PageRootNav />)
```

#### Items inside a page

`Navigator.SectionItems` renders a section's items as a grouped `List` — the
same rows as the generated list pane, with each item's `description` as
secondary text. It takes `value` (a section's item value; omit it for the
active section), `className` and `List`'s props, and renders nothing when the
section isn't found.

For anything richer, `useNavigatorSection(value?)` returns the same data for
you to lay out. It is computed during render from the navigation you declared,
so it works in the server render; with a `Navigator.Primary` that is not a
direct child of `Navigator`, it returns `null` until the Primary mounts. The
result is a fresh object each render — read its fields rather than keying an
effect on it.

```ts
type NavigatorSectionData = {
  value: string
  label: ReactNode
  href?: string
  groups: {
    title?: ReactNode
    items: {
      value: string
      label: ReactNode
      href?: string
      icon?: ReactElement
      description?: string
      badge?: ReactElement<BadgeProps>
      current: boolean
    }[]
  }[]
}
```

Loose items come back as a group with no title, in source order. `description`
is shown only by `SectionItems` and returned by the hook — never on a tile, the
bar, the list pane or More.

```tsx-live-noinline
function HomeCards() {
  const section = useNavigatorSection('/')
  if (!section) return null
  return (
    <div className='grid grid-cols-2 gap-3 px-4 pb-4'>
      {section.groups.flatMap((group) => group.items).map((item) => (
        <Card key={item.value} href={item.href} className='grid gap-1 p-4 no-underline'>
          <h3 className='text-display-ui-6 text-strong'>{item.label}</h3>
          <p className='text-sm text-subtle'>{item.description}</p>
        </Card>
      ))}
    </div>
  )
}
function HookNav() {
  return (
    <div className='h-[30rem] overflow-hidden rounded-2xl border border-subtle'>
      <DemoRouter initialPath='/'>
        {(path) => (
          <Navigator value={path} className='h-full'>
            <Navigator.Primary aria-label='Documentation'>
              <Navigator.Brand />
              <Navigator.Item value='/' href='/' icon={<HouseIcon />}>
                Home
                <Navigator.Secondary aria-label='Home pages' root='page'>
                  <Navigator.Item
                    value='/overview/installation'
                    href='/overview/installation'
                    description='Install the packages and wire up the CSS.'
                  >
                    Installation
                  </Navigator.Item>
                  <Navigator.Item
                    value='/overview/philosophy'
                    href='/overview/philosophy'
                    description='The goals and the mental model.'
                  >
                    Philosophy
                  </Navigator.Item>
                </Navigator.Secondary>
              </Navigator.Item>
            </Navigator.Primary>
            <Navigator.Content>
              <Pane role='detail' current>
                <Pane.Header>
                  <Pane.Title>{path === '/' ? 'Home' : path}</Pane.Title>
                </Pane.Header>
                {path === '/' ? <HomeCards /> : <p className='px-4 pb-4 text-subtle'>The page at {path}.</p>}
              </Pane>
            </Navigator.Content>
          </Navigator>
        )}
      </DemoRouter>
    </div>
  )
}
render(<HookNav />)
```
````

- [ ] **Step 3: The guideline**

In `## Guidelines`, after the `<Guideline title='Menus'>` block add:

```mdx
<Guideline title='Section roots'>
  <Guideline.Do code={`<Navigator.Item value='/' href='/' icon={<HouseIcon />}>\n  Home\n  <Navigator.Secondary aria-label='Home pages' root='page'>…</Navigator.Secondary>\n</Navigator.Item>`}>
    Use a page root when the section has an overview worth reading, such as
    Home or a dashboard.
  </Guideline.Do>
  <Guideline.Dont code={`<Navigator.Item value='/components' href='/components' icon={<CubeIcon />}>\n  Components\n  <Navigator.Secondary aria-label='Components' root='page' searchable>…</Navigator.Secondary>\n</Navigator.Item>`}>
    Give a catalogue you pick from a page root. Components is a list you
    search and choose from — keep the list root.
  </Guideline.Dont>
</Guideline>
```

Also add to the Accessibility list, after "Current destination":

```md
- **Page roots**: on a page-first section's own route the page is the root of
  the stack, so it shows no Back; its sub-pages get Back to the section route
  like any other.
```

- [ ] **Step 4: The changeset**

Append to `.changeset/navigator-list.md` (as it reads at that moment — the
other agent may have edited it):

```md

A section chooses what its route shows with `root` on `Navigator.Secondary`:
the generated list (`'list'`, default) or the page alone (`'page'`). A page
can render a section's items itself — `Navigator.SectionItems` for the same
rows as the list pane with each item's `description`, or `useNavigatorSection`
for the data. `Navigator.Item` takes `description`, shown only there.
```

- [ ] **Step 5: Verify**

```bash
grep -n 'get-started' docs/src/app/components/navigator/page.mdx
grep -rniE '(^|[^t])r[a]il' packages/components/src docs/src docs/contributing AGENTS.md .changeset --exclude-dir=node_modules --exclude-dir=dist
pnpm typecheck && pnpm lint
```

Expected: both greps print nothing; typecheck and lint green. In the dev
server (reuse or start on 9721), open `/components/navigator`: the two new
examples render, the `PageRootNav` example shows `SectionItems` rows with
descriptions on its root and a list pane beside its sub-pages (widen the
window past `lg`), and the Props table lists `Navigator.SectionItems` with
`value` and `Navigator.Secondary` with `root`, `Navigator.Item` with
`description`.

- [ ] **Step 6: Commit**

```bash
git add docs/src/app/components/navigator/page.mdx .changeset/navigator-list.md
git commit -m "docs(navigator): section roots, useNavigatorSection and Navigator.SectionItems"
```

---

## Task 7: Browser verification on the docs site

**Files:** none changed unless a check fails (then fix in the owning file,
with a test, and re-run the gate).

**Interfaces:**
- Consumes: the docs dev server (port 9721, or a running one), Playwright MCP
  tools (`browser_navigate`, `browser_resize`, `browser_evaluate`,
  `browser_click`, `browser_snapshot`).

- [ ] **Step 1: Build and serve**

```bash
pnpm --filter @oztix/roadie-core build && pnpm --filter @oztix/roadie-components build
lsof -iTCP -sTCP:LISTEN | grep node
```

If a docs `next dev` is listed, use its port; otherwise
`pnpm --filter docs exec next dev --port 9721` (in the background) and wait for
"Ready". Call the base URL `$BASE` below.

- [ ] **Step 2: The probe**

Every check runs this in `browser_evaluate` and reports the result verbatim in
the task report; a run where `innerWidth` is `0` is invalid.

```js
() => {
  const panes = [...document.querySelectorAll('[data-slot="pane"]')].map((pane) => ({
    section: pane.dataset.navigatorSection ?? null,
    role: pane.dataset.role,
    position: pane.dataset.stackPosition ?? null,
    visible: pane.getClientRects().length > 0 && getComputedStyle(pane).visibility !== 'hidden'
  }))
  const bar = document.querySelector('[data-slot="navigator-primary"][data-orientation="horizontal"]')
  const tabs = bar ? [...bar.querySelectorAll('[data-slot="navigator-tab-label"]')].map((el) => el.textContent) : []
  return {
    innerWidth: window.innerWidth,
    path: location.pathname + location.search,
    panes,
    back: document.querySelector('[aria-label="Back"]')?.getAttribute('href') ?? null,
    barVisible: bar ? bar.getClientRects().length > 0 : false,
    tabs,
    homeCards: document.querySelectorAll('[data-slot="card"][href]').length
  }
}
```

- [ ] **Step 3: Home at each width**

For each of 390, 900, 1440 (`browser_resize` then `browser_navigate` to `$BASE/`):

- `panes` contains no entry with `section === '/'`; the `detail` pane is `top`
  and visible.
- `back` is `null`.
- `homeCards` is at least 5 (the Home guides; the other home cards count too).
- At 390: `barVisible` is `true` and `tabs` starts `['Home', 'Foundations', 'Components', 'More']`
  (the Appearance circle's label follows). At 900 and 1440 the bar is hidden.

- [ ] **Step 4: A Home sub-page**

Navigate to `$BASE/overview/philosophy` at 1440: a `list` pane with
`section === '/'` is present and visible beside the `detail` pane (both visible;
at `lg` positions are columns, not a stack). At 390: the list pane is `behind`
and not visible, the detail is `top`, and `back` is `/`. At 900: same as 390
(panes stack below `lg`).

- [ ] **Step 5: Tab-tap rules at 390**

On `$BASE/overview/philosophy` at 390, `browser_click` the bar's Home tab
(the link whose `navigator-tab-label` reads "Home"). Expected: `path` becomes
`/`, no list pane, `back` null — not `?nav`. Then scroll the detail viewport
(`document.querySelector('[data-slot="pane-viewport"]').scrollTop = 600`),
click Home again: `path` still `/` and the viewport's `scrollTop` returns to
`0` (read it after 600 ms for the smooth scroll).

Then on `$BASE/components/button` at 390 click the Components tab: `path`
becomes `/components/button?nav` and the `/components` list pane is `top`
(the list-first behaviour is unchanged). Click it again: `?nav` is gone.

- [ ] **Step 6: Components unchanged**

`$BASE/components` at 1440: list pane `/components` visible beside the detail,
search field present. At 390: the list pane is `top`, `back` null. `$BASE/components/button`
at 390: detail `top`, `back` is `/components`.

- [ ] **Step 7: The Navigator docs page**

`$BASE/components/navigator` at 1440: the "Section roots" heading exists; in
the `PageRootNav` example (its frame), the `[data-slot="navigator-section-items"]`
list has rows with `[data-slot="list-item-subtitle"]`; clicking "Installation"
in it shows a `[data-navigator-section="/"]` pane in that frame. The Props
table has an `Navigator.SectionItems` heading.

- [ ] **Step 8: Console**

`browser_console_messages` on `/`, `/overview/philosophy` and
`/components/navigator`: no `[Roadie]` warnings, no hydration errors.

- [ ] **Step 9: Report and clean up**

Stop the dev server only if this task started it. Write each probe result
into the task report. Nothing to commit unless a fix was needed.

---

## Self-review against the spec

**Spec coverage**

| Spec | Task |
| --- | --- |
| §1 `root?: 'list' \| 'page'` on `Secondary`, default `'list'` | 1 |
| §1 table: page root shows the page full width, no generated list, no Back; sub-pages as list | 1 (client + SSR tests) |
| §1 tab tap: sub-page → root; root → scroll to top; list-first unchanged | 2 |
| §1 `showList` shows the list over a sub-page, no effect on a page root | 1 (tests "ignores showList on the root", "still shows the list over a sub-page") |
| §1 server render knows the root kind | 1 step 3-4 (walk sets `root`; `listPaneShows` is render-time), `NavigatorServerRender` tests |
| §1 `SecondaryPane` override only where a list pane would show | 1 step 5 + test |
| §1 guideline | 6 step 3 |
| §2 `useNavigatorSection(value?)` shape, active section without argument, any section by value, loose items untitled, render-time, `'use client'` | 3 |
| §2 `Navigator.SectionItems` — same rows, descriptions, `value`, `className`, list props, nothing when not found | 4 |
| §2 `description` on `Item`, never shown by the navigation | 3 (prop), 4 (test "keeps description out of the navigation") |
| §3 Home section at `/`, `HouseIcon`, "Home", `root='page'`; Get started pages under it | 5 steps 1-2 |
| §3 `/get-started` deleted; hero button to the first Home sub-page | 5 steps 4, 6 |
| §3 home page cards through the hook, each with a description | 5 step 3 |
| §3 phone bar Home, Foundations, Components, More, Appearance circle | 5 step 7, 7 step 3 (no code change needed: Tokens is `low`, source order does the rest) |
| §3 `FooterNav` treats `/` like any section route | 5 step 5 |
| §4 unknown value → null / nothing, no warning | 3, 4 tests |
| §4 routeless `root='page'` → existing warning, treated as list | 1 test "treats a routeless page root as a list root" (asserts one warning) |
| §4 wrapped Primary → published after mount, documented | 3 (S3, test), 6 step 2 prose |
| §4 expanded vertical navigation unaffected | no pane code touches `expanded`; Task 7 runs at 1440 with the cookie as found |
| §5 unit tests listed | 1, 2, 3, 4 |
| §5 server-render test | 1 step 2 |
| §5 browser checks at 390, 900, 1440 | 7 |
| §5 docs section, guideline, hook and `SectionItems` examples; Props table; changeset | 6 |

**Gaps / conflicts found in the code, decided above:** the spec's
`/overview/installation` route vs the real `/overview/getting-started` (S7);
Vue integration not named by §3 (S7 keeps it); the hero button already pointing
at the first sub-page (S8).

**Placeholder scan:** no TBD/TODO; every code step carries its code; every
test step names its command and expected outcome.

**Type consistency:** `NavigatorSecondaryRoot` (Task 1) is the type of
`NavigatorActiveSection.root` (Task 1) read by Tasks 2 and 4;
`primaryChildren` / `setPrimaryChildren` / `primaryDerived` (Task 3) are the
names Task 4's `SectionItems` and Task 3's hook read; `sectionRows` returns
`SectionRowGroup[]` with `kind`, `title`, `rows: SectionRow[]` and
`NavigatorSectionList` destructures exactly those; `toSectionData` returns
`NavigatorSectionData` re-exported from `useNavigatorSection.ts` and
`index.tsx`; `findSectionByValue(primaryChildren, itemValue)` has the same
signature in Tasks 3 and 4; the docs import `useNavigatorSection` from
`@oztix/roadie-components/navigator`, which Task 3 step 7 exports.


