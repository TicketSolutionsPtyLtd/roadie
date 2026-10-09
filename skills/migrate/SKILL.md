---
name: migrate
description: Use when moving an app off deprecated Roadie APIs or onto a new Roadie major, or when typecheck, lint, or an editor flags a Roadie deprecation. Reads the deprecations in the installed manifest, finds each use in the app, runs a codemod where the rewrite is mechanical (LinkButton to Button with href, as to render, IconButton icon-* sizes, Popover positionerProps placement, renamed widget exports), migrates the rest by hand from the deprecation's reason, then typechecks and builds. Triggers on "migrate Roadie", "upgrade Roadie", "remove deprecated Roadie APIs", "LinkButton is deprecated", "as is deprecated, use render", "Roadie v3".
---

# Roadie migrate

Move an app off deprecated Roadie APIs. Codemods make the rewrites that are
mechanical and keep behaviour; you make the rest by hand from the reason each
deprecation gives. Finish with no deprecated use left, or a written reason for
each one that stays.

The codemods are the `codemods/` folder next to this file. Run them by their
absolute path from this skill's base directory, which Claude Code gives when
the skill loads. They run with [jscodeshift](https://github.com/facebook/jscodeshift),
pinned to the version the tests use.

## 0. Before you start

- **A clean working tree.** Commit or stash first, so the codemods' changes
  show as one reviewable diff.
- **The setup.** Several replacements route `href` through the Link given to
  `RoadieProvider`. If the app has no `RoadieProvider` with its router's Link,
  run `/roadie:setup` first, or internal links do full page loads.
- **The tools.** Note the package manager (from the lockfile), the typecheck
  and build scripts, and the formatter (Prettier, Biome, or ESLint fix).

## 1. List the deprecations

Each Roadie package ships `dist/roadie.manifest.json`, which matches the
installed version. Its `deprecations` entries name the `import`, the `export`,
the `prop` when only a prop is deprecated, and the `reason`, which says what
replaces it. Print them all:

```bash
node -e '
for (const p of ["core", "components", "charts", "widgets"]) {
  let manifest
  try { manifest = require(`@oztix/roadie-${p}/roadie.manifest.json`) }
  catch { console.log(`no manifest: @oztix/roadie-${p}`); continue }
  for (const d of manifest.deprecations)
    console.log([d.import, d.export, d.prop ?? "", d.reason].join(" | "))
}'
```

Run it from the app's folder, so Node finds the packages wherever the
package manager put them, including a workspace root.

A package without a manifest is either not installed or older than the
release that added it. For an older one, use the table in step 3, and also
search the installed types for anything newer:
`grep -rn "@deprecated" node_modules/@oztix/roadie-*/dist --include='*.d.ts'`.

Moving to a new major? Read the release notes for every version between the
old and the new one, in
`https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/packages/<package>/CHANGELOG.md`
(`components`, `core`, `charts`, or `widgets`). A major removes what the
previous one deprecated, so migrate on the old version first, while the
deprecated API still works, then upgrade.

## 2. Find the uses

Search the app's source for each entry: the export's name for an export
deprecation, and the prop for a prop deprecation. Formatters often put each
prop on its own line, so search for the prop alone and read which element it
sits on. Compound parts appear as `<Root.Part`, such as `<Breadcrumb.Link`.
For example:

```bash
grep -rnE --exclude-dir={node_modules,.next,dist} "\bLinkButton\b|\bLinkIconButton\b" .
grep -rnE --exclude-dir={node_modules,.next,dist} "\bas=" .
```

When every export of one `import` is deprecated with the same reason, such
as widgets' `/cart-drawer/core`, the path is what moved. Search for the path,
not each name, which also matches the same names imported from the new path.

Keep the list. It's what step 5 checks off.

## 3. Pick a codemod or a hand migration

| Deprecation                                                                                                                                            | Codemod             | By hand                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------- |
| `LinkButton`, `LinkIconButton` (`/link-button`)                                                                                                        | `link-button`       | Uses the codemod reports, and the `LinkButton*` types   |
| `as` on `Card`, `Breadcrumb.Link`, `Carousel.Title`, `Carousel.TitleLink`, `Mark`, `Highlight`, `Prose`, or any `as` whose reason says to use `render` | `as-to-render`      | Uses the codemod reports, and type errors after it      |
| `'icon-*'` sizes on `IconButton` (a deprecated type, so not in the manifest)                                                                           | `icon-button-size`  | A `size` that isn't a string literal, such as a ternary |
| `side`, `align`, `sideOffset`, `alignOffset` in `Popover.Content`'s `positionerProps` (nested, so not in the manifest)                                 | `popover-placement` | Uses the codemod reports                                |
| `@oztix/roadie-widgets/cart-drawer/core`, `CartExpiryModals`, `CartExpiryModalsProps`                                                                  | `widgets-renames`   | `.vue` files                                            |
| `intent` on `Input`, `Textarea`, `Select.Trigger`, `Field.Input`, `Field.Textarea`                                                                     | None                | Always, see step 5                                      |
| `motion-fade-in`, `motion-scale-in`, `motion-pop-in`, `motion-fade-out`, `motion-scale-out`                                                            | None                | Always, see step 5                                      |
| Anything else                                                                                                                                          | None                | Follow its reason                                       |

A codemod changes only what it can prove keeps behaviour, apart from the
replacement's own defaults (step 5 lists them). Everything else it leaves
alone and reports as `file:line` with why, and that line is yours to migrate
by hand.

## 4. Run the codemods

Run each one that step 3 picked, in this order, over the app's source
folders:

```bash
CODEMODS=<this skill's base directory>/codemods
npx --yes jscodeshift@17.3.0 -t "$CODEMODS/link-button.js" \
  --extensions=tsx,ts,jsx,js --ignore-pattern='**/node_modules/**' \
  --ignore-pattern='**/.next/**' --ignore-pattern='**/dist/**' src app
```

- `link-button` runs before `icon-button-size`, which also cleans the
  `'icon-*'` sizes on the `IconButton`s it made.
- `as-to-render` takes `--targets` from the manifest: every `export` whose
  entry has `prop: "as"` and a reason that says to use `render`, joined with
  commas (`--targets=Card,Breadcrumb.Link,Mark`). Without it, it covers the
  components in the table.
- Use `pnpm dlx`, `yarn dlx`, or `bunx` in place of `npx` to match the app.
- Read the `REP` lines in the output. Each is a use left for step 5.
- Run the app's formatter on the changed files. The codemods print new code
  with single quotes and semicolons.

What they change:

- **`link-button`.** `<LinkButton href>` becomes `<Button href>`, and
  `<LinkIconButton href>` becomes `<IconButton href>`, imported from
  `@oztix/roadie-components/button`. It drops `as='a'`, and the old import
  once nothing else uses it. It leaves any use with another `as`, a spread,
  or no `href`, because `Button` without `href` renders a `<button>`.
- **`as-to-render`.** A tag name moves to `render`: `as='section'` becomes
  `render={<section />}`. The component passes its props to the render
  element, so `onClick` and the rest stay where they are. It leaves a
  component (`as={NextLink}`), whose required props must go on the render
  element, a dynamic `as` (a variable or a condition), and any element that
  already has `render`.
- **`icon-button-size`.** `size='icon-md'` becomes `size='md'` on
  `IconButton` and `LinkIconButton`. It leaves `Button`, where the
  `'icon-*'` sizes are current and make it square.
- **`popover-placement`.** Moves the four placement keys out of an object
  literal `positionerProps` onto `Popover.Content`, and removes
  `positionerProps` once it's empty. A key already set on `Popover.Content`
  wins when it's defined, so a literal one drops its `positionerProps` twin
  and any other becomes `side={side ?? 'top'}`. It leaves a
  `Popover.Content` that spreads props.
- **`widgets-renames`.** Moves `@oztix/roadie-widgets/cart-drawer/core`
  imports to `@oztix/roadie-widgets/cart`, and renames `CartExpiryModals`
  and `CartExpiryModalsProps` to `CartExpiryDialogs` and
  `CartExpiryDialogsProps` with every reference in the file. If the new
  name is taken in the file, it keeps the old local name as an alias. A
  re-export or shorthand object key keeps its old public name, and a kept
  re-export is reported. An `export … from` the old path moves to the new
  one.

Each codemod also follows a namespace import, such as
`import * as Roadie from '@oztix/roadie-components'`. It migrates
`<Roadie.Card as='section'>`, `Drawer.CartExpiryModals`, and the rest as it
would a named import, and `<Roadie.LinkButton href>` becomes
`<Button href>` with `Button` imported from
`@oztix/roadie-components/button`. `link-button` and `widgets-renames` also
report a deprecated name read off a namespace outside JSX, such as
`Roadie.LinkButtonProps`, and a namespace used whole, such as
`{ ...Roadie }`.

Both report every `export … from` that re-exports a deprecated name, and
every `export *` from a module that exports one, because renaming them
changes the app's own exports.

## 5. Migrate the rest by hand

Work through the reports and the step 2 list.

- **`LinkButton` or `LinkIconButton` with `as={Link}`.** Pass the router's
  Link to `RoadieProvider` once, then write `<Button href='/x'>` with no
  `as`. Never keep a router Link in `render` beside `href`: `render` wins,
  and routing through the provider stops.
- **`LinkButton` with spread props.** Find where the props come from. If
  they always carry `href`, rename it to `Button` and type the props as
  `ButtonProps` from `@oztix/roadie-components/button`.
- **`LinkButton` with no `href`.** It rendered an anchor with nowhere to go.
  Give it an `href`, or make it a `Button` with `onClick`.
- **`LinkButtonProps` and the other `LinkButton*` types.** Use `ButtonProps`
  or `IconButtonProps`. The intent, emphasis, and size unions are on them.
- **External links.** `Button`, `IconButton`, and the other components that
  take `href` open an external one (`http`, `https`, or `//`) in a new tab
  with `rel='noopener noreferrer'`. `LinkButton`, and a router Link in `as`,
  opened it in the same tab. Keep the new default, as the linking
  foundations page asks, unless the link must stay in the tab; then pass
  `target='_self'`.
- **`disabled` on a former `LinkButton`.** `LinkButton` ignored it and
  stayed a working link. `Button href` with `disabled` sets `aria-disabled`
  and blocks the click. Remove `disabled` if the link should still work.
- **`data-slot`.** A former `LinkButton` renders `data-slot='button'`, and a
  `LinkIconButton` `data-slot='icon-button'`, not `link-button` and
  `link-icon-button`. Update app CSS and tests that select on the old slot.
- **A component in `as`.** With an `href`, drop `as` and keep `href`, so
  `<Card as={NextLink} href='/x'>` becomes `<Card href='/x'>` and the
  provider's Link routes it. Without one, pass the component to `render`
  with its required props: `render={<MyLink to='/x' />}`.
- **Dynamic `as`.** Choose the element in `render`:
  `render={linked ? <a href={url} /> : <div />}`. A heading level from a
  variable becomes `render={createElement(level)}`.
- **Type errors after `as-to-render`.** With `as='button'`, the component
  accepted button props such as `type` and `disabled`. Move those onto the
  render element: `<Card render={<button type='button' disabled={busy} />}>`.
- **`intent` on a form control.** Remove it. A control takes its colour
  from its state. Where `intent='danger'` marked an error, set `invalid` on
  the `Field` around the control and add a `Field.ErrorText`. Where it
  marked success or a warning, put that in `Field.HelperText` or a
  `Callout`.
- **Motion classes.** Rename `motion-fade-in` to `animate-fade-in`,
  `motion-scale-in` to `animate-scale-in`, and `motion-pop-in` to
  `animate-pop-in`. `motion-fade-out` and `motion-scale-out` have no
  replacement; use `motion-scale` or `motion-slide` for the exit.
- **`.vue` files.** jscodeshift can't parse them. Make the same widget
  renames by hand in each `<script>` block and template.
- **Anything else.** Do what the reason says. If it names no replacement,
  open the component's docs page (the manifest links it, or start from
  `https://ticketsolutionsptyltd.github.io/roadie/llms.txt`) before you
  change it.

## 6. Verify

- [ ] The step 2 searches find no deprecated use, or each one left has a
      reason the user agreed to.
- [ ] Typecheck passes (the app's script, or `npx tsc --noEmit`).
- [ ] The build passes (`next build`, or the app's build script).
- [ ] Lint passes, and the formatter has run on every changed file.
- [ ] A converted `Button href` renders an `<a>` and navigates without a
      full page load.

## 7. Report

Tell the user what changed and what didn't:

- what each codemod changed, by file count;
- what you migrated by hand, and how;
- what's left, with the reason, and any behaviour change they should check,
  such as external links that now open in a new tab.

Don't commit unless they ask.
