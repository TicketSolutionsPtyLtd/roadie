# Content documentation template

**Starting point.** The Content section doesn't exist yet. INNO-1150 builds
its voice, tone, language, and grammar pages and refines this template from
what they need. Follow [`DOCS_PAGES.md`](DOCS_PAGES.md) too.

A content page says how Oztix writes, in docs, interfaces, and brand copy.
Each rule is short, shows the words, and follows itself.

## Structure

```mdx
export const metadata = {
  title: 'Grammar',
  description: 'One sentence on what these rules cover.',
  category: 'Content'
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
2. **Show the words.** Each rule has a write and not table or a `Guideline`
   pair. A pair's `example` shows the words where they appear, such as on a
   `Button`; words that stand alone go in a table.
3. **Names come from [`EXAMPLE_DATA.md`](EXAMPLE_DATA.md).** Only Australian
   cities and bands are real.
4. **One home per rule.** When a Content page lands, the copy rules it absorbs
   (in `PR_WORKFLOW.md`, decision 0006, and the date and time foundation)
   point to it instead of repeating it.
5. **Category** waits on the Content catalogue in
   `docs/src/lib/page-manifest.ts`, which INNO-1150 adds. Vocabulary waits
   until it's agreed.
