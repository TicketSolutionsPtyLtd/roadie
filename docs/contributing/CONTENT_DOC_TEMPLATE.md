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

import { Button } from '@oztix/roadie-components/button'

Two or three sentences on why these rules exist and who they're for.

## Rule name

One or two sentences on the rule.

| Write                          | Not                             |
| ------------------------------ | ------------------------------- |
| Doors open at 7pm              | Doors open @ 7pm                |
| Ochre Kite Weekender, Brisbane | Ochre Kite Weekender - Brisbane |

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
2. **Show the words.** Each rule has a write and not table, or a before and
   after table for a draft being edited, or a `Guideline` pair. A pair's
   `example` shows the words where they appear, such as on a `Button`; words
   that stand alone go in a table.
3. **A wrong dash is an entity.** A "not" cell that shows an em or en dash
   writes it as `&mdash;` or `&ndash;`, so `grep -n '[—–]'` still finds none.
4. **Names come from [`EXAMPLE_DATA.md`](EXAMPLE_DATA.md).** Only Australian
   cities and bands are real.
5. **One home per rule.** A copy rule lives on one Content page. Other files,
   such as `PR_WORKFLOW.md`, `CODING_STANDARDS.md`, the Copilot instructions,
   and the chart pages, link to it instead of repeating it. Dates and times
   live on the Date and time foundation, which the Content menu cross lists.
6. **Category** is `Writing` or `Formats`, from the Content catalogue in
   `docs/src/lib/page-manifest.ts`. Vocabulary waits until it's agreed.
