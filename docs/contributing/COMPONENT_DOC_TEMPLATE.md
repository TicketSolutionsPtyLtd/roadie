# Component Documentation Template

Reference for writing and reviewing Roadie component and chart docs. Follow [`DOCS_PAGES.md`](DOCS_PAGES.md) too, which holds the conventions for every docs page.

## Structure

The literal MDX skeleton lives in `docs/src/app/components/fieldset/page.mdx`. Copy it as a starting point for new component docs.

The skeleton contains:

- Frontmatter `export const metadata = { title, description, status, category }`
- `import { PropsDefinitions } from '@/components/PropsDefinitions'`
- A one-line description, with no `#` heading, because the layout renders `metadata.title` as the page's `h1`
- `## Import` with a subpath import (never the barrel)
- `## Examples` starting with a `### Default` `tsx-live` block
- Optional `### Variants` / `### Emphasis` / `### Sizes` / `### Intents` / `### States` / `### Composition` sections
- `## Guidelines` and `## Accessibility` for interactive components. The guidelines sit in one `<Guidelines>`, as in the Guidelines section below
- `## Hooks`, only when the component exports a hook: one `### useX` subsection per hook, each a signature and a return table
- A trailing `<PropsDefinitions component='…' />` naming the component

## Rules

1. **One-line description**: no "The X component is...". Just "A compact label for status and counts."
2. **Import section uses the per-compound subpath**: `'@oztix/roadie-components/fieldset'`, **not** the root barrel. Subpath is canonical and scopes the Next.js compiler walk.
3. **Use bare `<Compound>` in code examples**: not `<Compound.Root>`. `<Fieldset>` is the canonical form; `<Fieldset.Root>` is a supported alias but docs should always show the bare form.
4. **Default first**: every Examples section starts with simplest usage.
5. **Only include sections that apply**: no empty Intents on components that don't use it.
6. **Intents**: only when intent visibly changes appearance at rest (Badge, Button, Card). Omit for form controls (Input, Textarea, Select, Field, RadioGroup), whose state colours come from `is-interactive-field`.
7. **States**: for any interactive component. Single live example with labelled states.
8. **Composition**: for compound components (Field, Card, Accordion, Breadcrumb, Select).
9. **Guidelines**: brief, only non-obvious things. Oztix context goes here.
10. **Accessibility**: for interactive components. Keyboard patterns, ARIA, screen reader notes.
11. **No duplicates**: if disabled is in States, don't add separate Disabled section.
12. **Minimal examples**: show only the feature. Layout with `grid gap-2` or `flex flex-wrap gap-2`.
13. **State labels**: `<p className='text-sm text-subtle'>Label</p>` above each state.
14. **Hooks**: every public hook gets a `## Hooks` section, after Accessibility and before `<PropsDefinitions>`, on the page of the component it belongs to: a `tsx` signature, then a return-value table. Foundations pages link to it and never re-document the signature or return shape.

## Live examples

- A `tsx-live` fence renders when it comes within a screen of view, and shows a placeholder and its code until then. Add `-noinline` when the code calls `render()`, and `-expand` for a Full width button.
- MDX pages render inside `.prose`, and each live example opts out with `data-not-prose`. A `.prose` inside that escape stays unstyled, so an example that demos `.prose` or `Prose` uses a `tsx-live-prose` fence, which escapes only its toolbar and code.
- Each example on an MDX page also gets its own page at `/examples/<page>/<id>/`, opened from the button beside Copy. The id is the nearest heading's slug, with `-2`, `-3` for later examples under the same heading.
- Fence meta after the language sets options: `id=orders` pins the id (lowercase kebab-case, unique on the page), so a link survives a heading rename; `eager` renders the example on load, for the rare one that must.
- Examples on `.tsx` pages (`<CodePreview language='tsx-live'>`) load lazily too, but have no page of their own.
- Live examples can use every component, every chart, and the SpotIllustrations without importing them.
- Markdown tables scroll sideways on narrow screens by themselves, so don't wrap them.
- Do and don't pairs use `<Guideline>` with `<Guideline.Do>` and `<Guideline.Dont>`. Each takes text, and optionally an `example` (rendered JSX) or a `code` string.

## Guidelines section

Layout in top-level MDX comes from the `Guideline` components, never `className`:

```mdx
import { Guideline, Guidelines } from '@/components/Guideline'

## Guidelines

<Guidelines>

<Guideline title='Pair a meaningful tile with a label'>
  <Guideline.Do
    example={
      <Guideline.Row>
        <IconTile intent='success'>
          <CheckCircleIcon weight='bold' />
        </IconTile>
        <p>Payment complete</p>
      </Guideline.Row>
    }
  >
    Add text beside a tile that carries meaning.
  </Guideline.Do>
  <Guideline.Dont
    width={56}
    example={<Callout title='Error'>Something went wrong.</Callout>}
  >
    Don't write a vague title.
  </Guideline.Dont>
</Guideline>

</Guidelines>
```

- `<Guidelines>` spaces the guidelines under the heading, and under any `###` group heading inside the section.
- `width` sets an example's width, from the spacing scale (`40`, `56`, `64`, or `72`), for one that would otherwise shrink to its content. It never overflows the card.
- `<Guideline.Row>` sets an example's parts side by side and centred, with any `<p>` caption at the guidance's size. The page's markdown for agents drops it and keeps the parts.

## `<PropsDefinitions>` usage

- **Name the component**: `component='Badge'`, or several in order: `component={['Checkbox', 'CheckboxGroup']}`. A compound lists its parts after its root, one section each (`Fieldset`, `Fieldset.Legend`, …).
- **Props come from the package's `dist/roadie.manifest.json`**, which the package build generates (`packages/core/scripts/manifest/`). Rebuild the package to see a prop change; `pnpm dev` regenerates it on each rebuild. The docs build fails on a name no manifest lists.
- **The manifest links each component to the page that names it**, so name every component a page documents.
- **`className` rows**: the manifest drops a plain, undocumented `className: string` forwarded from `@types/react`, since every part accepts it along with its element's other HTML attributes; that's true everywhere and doesn't need its own row. It keeps a `className` a part documents with a real description, or types as a Base UI state function.

## Section applicability by category

| Section       | Navigation | Layout | Actions | Fields | Choices | Date and time | Collections | Overlays | Status | Media & brand | Text  |
| ------------- | ---------- | ------ | ------- | ------ | ------- | ------------- | ----------- | -------- | ------ | ------------- | ----- |
| Default       | yes        | yes    | yes     | yes    | yes     | yes           | yes         | yes      | yes    | yes           | yes   |
| Variants      | maybe      | maybe  | maybe   | maybe  | maybe   | maybe         | maybe       | maybe    | maybe  | maybe         | maybe |
| Emphasis      | no         | no     | yes     | yes    | yes     | yes           | yes         | maybe    | yes    | no            | yes   |
| Sizes         | no         | no     | yes     | yes    | yes     | yes           | yes         | maybe    | yes    | no            | yes   |
| Intents       | no         | no     | yes     | no     | no      | no            | yes         | maybe    | yes    | no            | yes   |
| States        | yes        | no     | yes     | yes    | yes     | yes           | yes         | maybe    | yes    | no            | no    |
| Composition   | yes        | no     | no      | yes    | yes     | yes           | yes         | yes      | yes    | no            | no    |
| Accessibility | yes        | no     | yes     | yes    | yes     | yes           | no          | yes      | no     | no            | no    |
