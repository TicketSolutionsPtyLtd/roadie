---
name: docs-page
description: Use when writing, converting, or checking a Roadie docs page (a `page.mdx` under `docs/src/app/` for a component, chart, foundation, brand, or content page), and whenever a new component needs its page. Points at the page's template, runs the docs checks, reviews what no check catches, reads the markdown copy agents get, and screenshots the page at phone and desktop widths in light and dark. Works only in the Roadie repo. Triggers on "write the docs page", "document this component", "check the docs page", "does this page follow the template", "convert this page to MDX".
---

# Roadie docs page

Write a docs page, or check one, against its template. The templates hold the
rules and change often, so read them each time rather than from memory. They,
`AGENTS.md`, and `CODING_STANDARDS.md` win over anything here.

Every step reads Roadie's own docs files and scripts. In a repo without
`docs/contributing/DOCS_PAGES.md`, stop and say the skill only runs in Roadie.

## 1. Read

- The host's `AGENTS.md` and the Docs section of `CODING_STANDARDS.md`.
- `docs/contributing/DOCS_PAGES.md`, then the template its table names for the
  page type, and the skeleton that template names.
- The writing rules in section 3 of `docs/contributing/PR_WORKFLOW.md`, and
  `docs/contributing/EXAMPLE_DATA.md` for every name.
- What the page documents: the component's source and props, or the
  foundation's tokens.

## 2. Write

Copy the skeleton, keep only the sections that apply, and edit the `.mdx` by
hand. Never run Prettier on `.mdx`; it rewrites the code in fences. The rules
that slip most, each detailed in `DOCS_PAGES.md` or a template:

- **Layout.** No `className` layout in top-level MDX, which
  `roadie/no-mdx-layout-class` fails. Use `Guidelines`, `Guideline` with
  `width`, and `Guideline.Row`. A layout they can't express is a new docs
  component, not a `div`.
- **Fences.** `tsx-live` for an example; `tsx-live-prose` only for one that
  demos `.prose` or `Prose`. `data-not-prose` goes on a docs component's own
  chrome, never in page MDX.
- **Copyable code.** Code in a fence is what readers copy, so it stays plain
  Roadie and Tailwind. Its layout follows the component template's example
  rules. Note, not yet an enforced check: no docs-only imports or helpers in
  fences, except getAssetPath for asset URLs, pending INNO-1193.
- **Guideline `code`.** A multi-line `code` prop opens with a line break after
  `` code={` `` and indents every line under the prop, so `Guideline` can
  dedent it (the foundation template says why).
- **Data-driven parts.** Values from tokens come from a small docs component
  named `<slug>/<Group><View>`, such as `dataviz/DatavizSwatches`, that reads
  the tokens. Never a hand-typed table.
- **No "below".** A docs component with no children drops out of the markdown
  copy, so no sentence points "below" at it.
- **Wiring.** A new component or chart page needs its catalogue tile (section
  4 of `PR_WORKFLOW.md`); a foundation needs its preview `case`.

## 3. Check

Check `uptime` and wait while the 1-minute load is over the host's limit. Then
run each step and record pass, fail with the line, or not applicable.

1. **Component docs.** `node scripts/check-component-docs.mjs` fails when an
   exported component has no page or no catalogue tile.
2. **Lint.** `pnpm --filter docs exec eslint src/app/<route>/page.mdx`. It
   runs `roadie/no-mdx-layout-class` on the MDX and the package rules on live
   fences. `pnpm --filter docs lint` runs every page.
3. **Catalogue tests.** `pnpm test:gated docs src/components/CataloguePreview.test.tsx`
   for a new page.
4. **Template, line by line.** Walk every rule in `DOCS_PAGES.md`, the page's
   template, its section table, and the writing rules. Checks don't catch
   these yet: section order and names, rules that depend on the component
   (Intents, States, Accessibility), state labels, the `PropsDefinitions`
   path, Guideline `code` indents, "below", example names, sentence case,
   dashes (`grep -n '[—–]'`), and the Oxford comma in every list of three or
   more, the description included.
5. **Markdown copy.** Build what the docs read
   (`pnpm exec turbo run build --filter=docs^...`, which `pnpm preview` also
   does), run `pnpm --filter docs generate:llms`, and read
   `docs/out/<route>.md` top to bottom. It should stand alone: no pointer to a
   part it dropped, no empty heading, each Guideline pair with its text and
   code, and the props reference at the end.
6. **Screenshots.** Serve the docs as `/roadie:demo` step 2 says, and adapt
   demo's script: 375px and 1280px wide, light and dark, the top of the page
   and each section that changed. Shoot the page content only: hide the fixed
   and sticky chrome outside `#docs-content`, and clip each shot to its box.
   Wait for lazy examples to render, then look at each shot. A placeholder,
   an overflow, or a wrong theme is a fail.

Fix every fail in the page and run the checks again. A rule that is wrong for
every page is fixed in its template or check, in its own commit, not ignored.

## 4. Report

```
Docs page check: /<route>
Component docs: pass
Lint: pass
Catalogue tests: pass
Template: <rule>: pass | fail (line N, what) | n/a, one line each
Markdown copy: pass | fail (what)
Screenshots: pass | fail (which shot, what)
Fixed: <what changed>
```

Put it under Evidence in the PR, with the screenshots as the host workflow
says.
