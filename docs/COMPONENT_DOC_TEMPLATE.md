# Component Documentation Template

Reference for writing and reviewing Roadie component docs.

## Structure

Every component doc follows this skeleton. Only include sections that apply.

```mdx

```

## Rules

1. **One-line description** — no "The X component is...". Just "A compact label for status and counts."
2. **Default first** — every Examples section starts with simplest usage
3. **Only include sections that apply** — no empty Intents on components that don't use it
4. **Intents** — only when intent visibly changes appearance at rest (Badge, Button, Card). Omit for form controls (Input, Textarea, Select, Field, RadioGroup)
5. **States** — for any interactive component. Single live example with labelled states
6. **Composition** — for compound components (Field, Card, Accordion, Breadcrumb, Select)
7. **Guidelines** — brief, only non-obvious things. Oztix context goes here
8. **Accessibility** — for interactive components. Keyboard patterns, ARIA, screen reader notes
9. **No duplicates** — if disabled is in States, don't add separate Disabled section
10. **Minimal examples** — show only the feature. Layout with `flex flex-col gap-2` or `flex flex-row flex-wrap gap-2`
11. **State labels** — `<p className='text-sm text-subtle'>Label</p>` above each state

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
