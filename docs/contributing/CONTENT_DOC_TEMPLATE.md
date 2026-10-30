# Content documentation template

A content page in `docs/src/app/content/` says how Oztix writes, in docs,
interfaces, and brand copy. Each rule is short, shows the words, and follows
itself. Follow [`DOCS_PAGES.md`](DOCS_PAGES.md) too.

## Structure

```mdx
export const metadata = {
  title: 'Grammar',
  description: 'One sentence on what these rules cover.',
  category: 'Writing'
}

import { Guideline, Guidelines } from '@/components/Guideline'
import { PairTable } from '@/components/PairTable'

import { Button } from '@oztix/roadie-components/button'

Two or three sentences on why these rules exist and who they're for.

## Part name

### Rule with short examples

One or two sentences on the rule.

<PairTable>

| Write                          | Not                             |
| ------------------------------ | ------------------------------- |
| 7pm                            | 7 pm                            |
| Ochre Kite Weekender, Brisbane | Ochre Kite Weekender @ Brisbane |

</PairTable>

<Guidelines>

<Guideline
  headingLevel={3}
  title='Rule with sentence examples'
  description='One or two sentences on the rule.'
>
  <Guideline.Do>Doors open at 7pm. The support act starts at 8pm.</Guideline.Do>
  <Guideline.Dont>
    Doors open at 7pm, and then after that the support act will start at 8pm.
  </Guideline.Dont>
</Guideline>

</Guidelines>

## Guidelines

<Guidelines>

<Guideline title='Lead with what the reader can do'>
  <Guideline.Do example={<Button>Buy tickets</Button>}>
    Name the action on the button.
  </Guideline.Do>
  <Guideline.Dont example={<Button>Click here</Button>}>
    Don't make the reader guess what happens next.
  </Guideline.Dont>
</Guideline>

</Guidelines>

## In the interface

How the rules apply to components, such as button labels and empty states,
with links to their pages.
```

## Rules

1. **The page follows its own rules.** Sentence case, Australian spelling,
   the Oxford comma, no em or en dashes, and no colons in headings.
2. **Show the words.** A rule whose examples are sentences is a `Guideline`
   with a `title` and `description` (`headingLevel={3}` under the part's
   `##`), with the sentences in its Do and Don't cards. Words or short phrases
   that stand alone go in a write and not table inside `PairTable`, which
   gives every table on the page the same two equal columns. A pair's
   `example` shows the words where they appear, such as on a `Button`.
3. **A wrong dash is an entity.** A "not" cell that shows an em or en dash
   writes it as `&mdash;` or `&ndash;`, so the docs content check
   (`node scripts/check-docs-content.mjs`) still passes.
4. **Names come from [`EXAMPLE_DATA.md`](EXAMPLE_DATA.md).** Only Australian
   cities and bands are real.
5. **One home per rule.** A copy rule lives on one Content page. Other files,
   such as `PR_WORKFLOW.md`, `CODING_STANDARDS.md`, the Copilot instructions,
   and the chart pages, link to it instead of repeating it. Dates and times
   live on the Date and time foundation, which the Content menu cross lists.
6. **Category** is `Writing` or `Formats`, from the Content catalogue in
   `docs/src/lib/page-manifest.ts`. Vocabulary waits until it's agreed.
