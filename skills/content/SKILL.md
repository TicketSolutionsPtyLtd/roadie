---
name: content
description: Use when writing, editing, or reviewing any Oztix copy, in any Oztix repo. That covers interface text (buttons, labels, errors, empty states, toasts, dialogs, and helper text), marketing pages, emails, social posts, support replies, docs pages, READMEs, PR descriptions, changesets, and release notes. Use it in place of the generic oztix-brand-guidelines skill for words. Loads the Roadie Content page for the job (Voice and tone, Language and grammar, Writing with AI), writes or edits against it, and reports a copy review by rule heading. Triggers on "write the copy", "review this copy", "check the wording", "error message", "button label", "microcopy", "UX copy", "tone of voice", "make this sound like Oztix", "email copy", "marketing copy", "proofread", "does this read as AI".
---

# Roadie content

Roadie's [Content section](https://ticketsolutionsptyltd.github.io/roadie/content)
is the source for every word Oztix writes. This skill loads the right page and
checks copy against it. It holds no rules of its own, so read the page every
time rather than working from memory.

## 1. Load the pages

The docs index, `https://ticketsolutionsptyltd.github.io/roadie/llms.txt`,
lists the Content pages. Each link ending in `.md` is the page as markdown.
Inside the Roadie repo, read `docs/src/app/content/` instead, which can be
ahead of the published site.

- **Any copy:**
  [Language and grammar](https://ticketsolutionsptyltd.github.io/roadie/content/language-and-grammar.md)
  and
  [Voice and tone](https://ticketsolutionsptyltd.github.io/roadie/content/voice-and-tone.md).
- **A draft an AI wrote, including yours:**
  [Writing with AI](https://ticketsolutionsptyltd.github.io/roadie/content/writing-with-ai.md)
  as well.
- **Interface text:** the page for every component the copy sits in (Button,
  Dialog, EmptyState, Field, Toast, and so on), whose Guidelines hold its copy
  rules, and any interface copy page the
  [Content index](https://ticketsolutionsptyltd.github.io/roadie/content.md)
  lists.
- **Dates and times:** the
  [Date and time](https://ticketsolutionsptyltd.github.io/roadie/foundations/date-and-time.md)
  foundation as well.

Sample names come from Roadie's
[example data](https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/EXAMPLE_DATA.md),
never a real venue, event, or promoter. Logo, colour, type, and imagery aren't
copy, so build those with `/roadie:build`.

## 2. Write

- Name the reader, the moment, and the market before drafting, and set the
  tone from Voice and tone.
- Draft, then run the checklist in section 3 on your own draft before
  showing it.
- In code, let Roadie format dates, times, prices, and numbers rather than
  building strings by hand (`/roadie:build` sections 12 and 13,
  `/roadie:charts` section 7).

## 3. Review checklist

Check each heading against its page, in this order. The headings name the
rules; the page holds them.

1. **Language and grammar, Clarity**: every heading under it, from Every line
   carries a fact to End on the next step.
2. **Voice and tone**: Personality traits, Principles, Tone for the moment,
   Markets, Headlines, body copy, and calls to action, and Before you publish.
3. **Language and grammar, Grammar**: Australian English, Sentence case,
   Contractions, Pronouns, Numbers, Lists, Industry terms, and Abbreviations.
4. **Language and grammar, Punctuation**: Dashes, Colons, Commas,
   Apostrophes, Quotation marks, Parentheses, Exclamation marks and emoji,
   Bold, Full stops, Ellipses, Slashes, and Ampersands.
5. **Language and grammar, Formats**: Dates and times, Prices, and Fees and
   offers.
6. **Guidelines** and **In the interface** on each page, and the Guidelines
   on each component page, for interface text.
7. **Writing with AI, The tells**: every tell.

If a heading named here has moved or gone, follow the page and say so in the
report.

## 4. Report a review

```
Copy review: <what was reviewed>
Pages: <pages read, and whether from the repo or the published site>

| Where | Was | Rules | Now |
| ----- | --- | ----- | --- |

Questions: <what the author must answer before a rewrite is final, or None>
Judgement calls: <preferences no rule covers, or None>
```

- One row per line of copy. **Was** quotes it, **Rules** lists every rule it
  breaks as `Page > Heading`, with the rule's own heading rather than the one above it, and
  **Now** is the rewritten line, not advice about it. When the fix is in code,
  such as a date component in place of a string, **Now** names the change.
- Where a rewrite needs a fact you don't have, put a `[placeholder]` in
  **Now** and the question under Questions.
- Every finding names a rule. A preference with no rule goes under Judgement
  calls.
- Leave passing lines out.
- Inside `/roadie:review`, report each finding in that skill's format. A rule
  break in shipped copy is Important, and anything else is Minor.

When writing rather than reviewing, give the copy, then the assumptions it
rests on, then one line naming the pages you checked it against.
