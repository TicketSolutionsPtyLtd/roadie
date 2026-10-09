# Foundation documentation template

Reference for writing, converting, and reviewing foundations pages in
`docs/src/app/foundations/`. Follow [`DOCS_PAGES.md`](DOCS_PAGES.md) too.

A foundation says when and why to use a part of the system. Every value is on
its `/tokens/` page, and every component API is on its component page.

## Structure

The skeleton comes from the sections the visual foundations share. Keep the
order and only the sections that apply. A topic of the page's own, such as
Component usage on Shape or Dark mode on Colors, gets a `##` section named
for it, after the scale or utilities it builds on and before Guidelines.

````mdx
export const metadata = {
  title: 'Shape',
  description: 'One sentence on what this part of the system does.',
  category: 'Visual'
}

import { Guideline, Guidelines } from '@/components/Guideline'

Two or three sentences that give the model and the one rule to remember.

## Radius scale

What the scale is for, then the docs component that renders it.

{/* A docs component that renders the tokens, such as <DatavizSwatches kind='heat' /> */}

| Tier      | Class        | Use for                     |
| --------- | ------------ | --------------------------- |
| Field     | `rounded-lg` | Inputs and select triggers  |
| Container | `rounded-xl` | Cards, popovers, and panels |

## Component usage

Which components use which step by default, as a guidance table.

| Component | Tier      | Class        |
| --------- | --------- | ------------ |
| Card      | Container | `rounded-xl` |

## Radius utilities

### Utility name

One sentence on when to use it.

```tsx-live
<Card className='rounded-xl'>Ochre Kite Weekender 2026</Card>
```

## Guidelines

- A rule that needs no picture.

<Guidelines>

<Guideline title='Match radius to hierarchy'>
  <Guideline.Do code="<Card className='rounded-xl'>…</Card>">
    Round containers more than the controls inside them.
  </Guideline.Do>
  <Guideline.Dont code="<Card className='rounded-sm'>…</Card>">
    Don't give a container the radius of an inline mark.
  </Guideline.Dont>
</Guideline>

</Guidelines>

## Accessibility

What this part of the system means for keyboard, screen reader, contrast, or
motion users.
````

## Sections

| Section         | Holds                                                    | Was called                                                    |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| Lead            | The model, with no heading                               | The `text-lg text-subtle` intro                               |
| Principles      | The few ideas the rest follows                           | Principles, Design principles, Grid vs Flexbox                |
| Scale           | The tokens, rendered, and when to use each step          | Radius scale, Shadow scale, Type scale, Spacing scale, Sizing |
| Page-specific   | A topic of this page's own, such as Component usage      | Component usage (Shape), Dark mode (Colors)                   |
| Utilities       | The classes or props that apply it, each with an example | Text style utilities, Interaction utilities, Emphasis presets |
| Patterns        | Recipes that combine them, each with an example          | Patterns, Examples, Visual examples, Component recipes        |
| Guidelines      | Rules as bullets, then do and don't pairs                | Guidelines, Usage guidelines, Best practices                  |
| Accessibility   | What it means for assistive tech and user settings       | Everyone gets in (Motion); most pages have none               |
| Quick reference | A table that sums up a long page                         | Quick reference (Interactions and Motion)                     |

## Rules

1. **Name sections for the thing.** `## Radius scale`, not `## Scale`, and
   `## Interaction utilities`, not `## Utilities`.
2. **Lead with the model.** No "This page covers". The first sentence says
   what the system is.
3. **Show the scale, don't list it.** Render the tokens with a docs component
   (see [Data-driven parts](DOCS_PAGES.md#data-driven-parts)). Add a markdown
   table only for guidance a person writes, such as which tier to use where.
   It names each step and its class but not its value, which the docs
   component shows from the tokens.
4. **Link the full token list.** Add the page to its family's `guidance` in
   `docs/src/lib/token-families.ts`, and the layout links the tokens under the
   title. Don't add a related links section.
5. **Example, then explanation.** One sentence of lead-in, then the
   `tsx-live` example, then anything the example can't show.
6. **One Guidelines section.** Best practices and usage guidelines merge into
   it. Rules that need no picture come first as plain bullets, then
   `Guideline` pairs for rules that do. No bold-label bullets.
7. **API stays on the component page.** Link to a component's props or hooks
   rather than re-documenting them, as rule 14 of the
   [component template](COMPONENT_DOC_TEMPLATE.md#rules) says. A provider
   with no component page is the exception: when
   `packages/core/scripts/manifest/elsewhere.ts` points it at a foundation,
   as it does `RoadieLinkProvider` at Linking, its hooks get a `## Hooks`
   section there, in rule 14's format.
8. **New page wiring.** `category` is one of Visual, Content, Behaviour, or
   Building apps, and the page needs a `case` in
   `docs/src/components/FoundationPreview.tsx`.

## All-guidelines pages

A page that is all guidance, such as Performance, has no Guidelines section.
Each topic is a `##` section named for it, with a lead and then its own
`<Guidelines>`. Rule 6 holds within each topic: plain bullets first, then
`Guideline` pairs. Sections that aren't rules, such as a quick reference, come
after the topics.

## Converting a `page.tsx` page

For INNO-1159. Keep the URL and the content, except where it breaks a current
rule.

- `<section>` and `<h2 className='text-display-ui-3 …'>` become `##`
  headings, `<h3>` becomes `###`, and the intro becomes the lead.
- `<Code>` becomes backticks, and `&apos;` and `{' '}` go.
- A hand-built `<table>` of token values becomes a docs component that renders
  the tokens. A table of guidance becomes a markdown table.
- A `CodePreview` with `tsx-live` becomes a fenced example. A demo that holds
  state stays in the fence as a function component, or becomes a docs
  component when it's chrome rather than code to copy.
- `<Guideline>` keeps its props, including `headingLevel`, and a run of them
  goes inside one `<Guidelines>`.
- A multi-line `code` prop opens with a line break after `` code={` ``, and
  every line sits indented under the prop. MDX strips up to two spaces from
  each line, and `Guideline` drops the indent the lines share, so nesting
  survives.
- Metadata moves across as is, and the page is checked against this template.

## Docs components

- `Guidelines`, `Guideline`, `Guideline.Do`, `Guideline.Dont`, and
  `Guideline.Row` from `@/components/Guideline`. An `example` is rendered
  JSX with no layout classes. The markdown copy for agents prints its source
  as a `tsx` block, so build it from Roadie components, not styled `div`s. A
  rule about classes sets them on those components or shows them in `code`.
- Token renderers such as `DatavizSwatches` (`@/components/dataviz/`) and
  `ScaleGrid`, `IntentMatrix`, and `EmphasisGrid` (`@/components/tokens/`).
