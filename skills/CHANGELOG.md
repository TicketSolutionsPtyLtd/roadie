# roadie-skills

## 0.5.0

### Minor Changes

- 4e6fdc6: `/roadie:motion` animates with Roadie in place of the generic motion-dev-animations skill: the component or utility for the job first, then the duration and easing tokens, and reduced motion covered in CSS and JavaScript.

### Patch Changes

- a1e7c70: `/roadie:audit` flags an anchor passed to `render` (I6), which I2 and I3 missed
  when its `href` was an expression, and a hand-rolled icon tile (C5), which had
  no pattern. `/roadie:migrate` prints why a manifest is missing.
- 58a369e: The audit and build skills measure the 48px duotone threshold on the tile around the icon, as the iconography guide does, so an `EmptyState` tile's duotone icon is no longer a finding.
- 292ac56: `/roadie:pr` moves a ticket to In Progress when its first PR opens, and
  `/roadie:shepherd` moves it to Review when its last PR is ready and to Done,
  with a PR link, once it merges.
- 280e23a: `/roadie:migrate` runs its codemods with jscodeshift 17.4.0, the version their tests use.
- ca98c9b: The `/roadie:migrate` codemods no longer rewrite a local variable or parameter
  that shadows a Roadie import. They report an `import()` of a module with a
  deprecated export, and `widgets-renames` moves an `import()` of
  `/cart-drawer/core` to `/cart`.
- a9c7f01: `/roadie:motion` allows `animate-spin` for one job, a small status icon standing in for a pending action, as Toast's loading icon does.
- 4cdbd4c: The `/roadie:pr` and `/roadie:shepherd` privacy checks now cover the title,
  body, and commit messages, and flag a real person's name. Public text says
  "the maintainer" instead, as PR workflow section 7 says.
- 2da76e7: The skills README says a `roadie-skills` changeset is never major, and that an
  edit to the plugin manifest needs one.
- 8eebe74: The plugin's root is now `skills/`, so installing `roadie@roadie` caches only the skills, not the whole repository, and no longer warns about the pnpm lockfile.
- 3d41d5c: `/roadie:implement` removes only the scratch files it created, by exact path,
  and never deletes the scratchpad directory it shares with the parent session.
- 9dc16ca: `/roadie:implement` stops its dev servers and removes its scratch files and
  worktree when the work is done, and `/roadie:shepherd` removes the worktree
  after a merge the way PR workflow section 1 says.

## 0.4.0

### Minor Changes

- The repo is now a plugin marketplace, so the plugin installs as
  `roadie@roadie` and a repo can enable it in `.claude/settings.json`. The
  plugin is versioned as the private `roadie-skills` package, and Changesets
  writes this changelog.
- Adds `/roadie:build`, `/roadie:charts`, `/roadie:debug`, `/roadie:demo`,
  `/roadie:grill`, `/roadie:implement`, `/roadie:migrate`, `/roadie:pr`,
  `/roadie:release`, `/roadie:retro`, `/roadie:setup`, `/roadie:shepherd`,
  `/roadie:slice`, and `/roadie:spec`, which shipped on `main` without a
  version bump.

## 0.3.0

### Minor Changes

- Adds `/roadie:test`.

## 0.2.0

### Minor Changes

- Adds `/roadie:review`.

## 0.1.0

### Minor Changes

- Adds `/roadie:audit`.
