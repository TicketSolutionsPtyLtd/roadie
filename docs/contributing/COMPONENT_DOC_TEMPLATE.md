# Component Documentation Template

Reference for writing and reviewing Roadie component docs.

## Structure

The literal MDX skeleton lives in `docs/src/app/components/fieldset/page.mdx` — copy it as a starting point for new component docs. Prettier's markdown formatter eats nested `tsx-live` fences inside this file, so the skeleton can't be embedded here inline.

The skeleton contains:

- Frontmatter `export const metadata = { title, description, status, category }`
- `import { PropsDefinitions } from '@/components/PropsDefinitions'`
- `# {Component}` heading + one-line description
- `## Import` with a subpath import (never the barrel)
- `## Examples` starting with a `### Default` `tsx-live` block
- Optional `### Variants` / `### Emphasis` / `### Sizes` / `### Intents` / `### States` / `### Composition` sections
- `## Guidelines` and `## Accessibility` for interactive components
- A trailing `<PropsDefinitions componentPath='…' />` pointing at the folder (per-file compound) or the `index.tsx` (pre-Phase-3 monolithic compound)

## Rules

1. **One-line description** — no "The X component is...". Just "A compact label for status and counts."
2. **Import section uses the per-compound subpath** — `'@oztix/roadie-components/fieldset'`, **not** the root barrel. Subpath is canonical and scopes the Next.js compiler walk.
3. **Use bare `<Compound>` in code examples** — not `<Compound.Root>`. `<Fieldset>` is the canonical form; `<Fieldset.Root>` is a supported alias but docs should always show the bare form.
4. **Default first** — every Examples section starts with simplest usage.
5. **Only include sections that apply** — no empty Intents on components that don't use it.
6. **Intents** — only when intent visibly changes appearance at rest (Badge, Button, Card). Omit for form controls (Input, Textarea, Select, Field, RadioGroup).
7. **States** — for any interactive component. Single live example with labelled states.
8. **Composition** — for compound components (Field, Card, Accordion, Breadcrumb, Select).
9. **Guidelines** — brief, only non-obvious things. Oztix context goes here.
10. **Accessibility** — for interactive components. Keyboard patterns, ARIA, screen reader notes.
11. **No duplicates** — if disabled is in States, don't add separate Disabled section.
12. **Minimal examples** — show only the feature. Layout with `grid gap-2` or `flex flex-wrap gap-2`.
13. **State labels** — `<p className='text-sm text-subtle'>Label</p>` above each state.

## `<PropsDefinitions>` usage

- **Single component** → point at the `index.tsx` file: `componentPath='packages/components/src/components/Badge/index.tsx'`.
- **Per-file compound** (Fieldset, and every compound migrated in Phase 3) → point at the **folder**: `componentPath='packages/components/src/components/Fieldset'`. `PropsDefinitions` enumerates every non-test `.tsx` file in the folder, rewrites the parsed leaf names from `FieldsetLegend` → `Fieldset.Legend` using the folder basename, and renders the Base UI-style API reference (section heading = dot-notation displayName, one stacked card per sub-component).
- **Pre-Phase-3 compound** (monolithic `index.tsx` — Accordion, Card, Select, etc., while they are still being migrated) → point at the `index.tsx` file. The parser picks up the property-assignment pattern directly.

## Section applicability by category

| Section       | Actions | Forms | Data Display | Typography | Layout | Navigation | Media |
| ------------- | ------- | ----- | ------------ | ---------- | ------ | ---------- | ----- |
| Default       | yes     | yes   | yes          | yes        | yes    | yes        | yes   |
| Variants      | maybe   | maybe | maybe        | maybe      | maybe  | maybe      | maybe |
| Emphasis      | yes     | yes   | yes          | yes        | no     | no         | no    |
| Sizes         | yes     | yes   | yes          | yes        | no     | no         | no    |
| Intents       | yes     | no    | yes          | yes        | no     | no         | no    |
| States        | yes     | yes   | yes          | no         | no     | yes        | no    |
| Composition   | no      | yes   | yes          | no         | no     | yes        | no    |
| Accessibility | yes     | yes   | no           | no         | no     | yes        | no    |
