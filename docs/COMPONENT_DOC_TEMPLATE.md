# Component Documentation Template

Reference for writing and reviewing Roadie component docs.

## Structure

Every component doc follows this skeleton. Only include sections that apply.

````mdx
export const metadata = {
  title: 'ComponentName',
  description: 'One-line description of what it is',
  status: 'beta',
  category: 'Forms' // Actions | Forms | Data Display | Typography | Layout | Navigation | Media
}

import { PropsDefinitions } from '@/components/PropsDefinitions'

# Component name

One-line description. Say what it _is_, not what it _does_.

## Import

\```tsx
import { ComponentName } from '@oztix/roadie-components'
\```

## Examples

### Default

Simplest possible usage. No props, no wrappers.

\```tsx-live

<ComponentName />
\```

### Variants

(if applicable) Appearance, type, mode — any non-intent/emphasis/size variant.

### Emphasis

(if applicable) Show all emphasis levels.

### Sizes

(if applicable) Show all size variants.

### Intents

(if applicable) Only when intent visibly changes the component at rest.
Omit for form controls — they manage intent via is-field-interactive.

### States

(if applicable) Show interactive states in a single example with labels.
Form controls: default, invalid, disabled.
Buttons: note about hover/focus in description.
Toggles: checked/unchecked, open/closed.

\```tsx-live

<div className='flex flex-col gap-4'>
  <div className='flex flex-col gap-1'>
    <p className='text-sm text-subtle'>Default</p>
    <ComponentName />
  </div>
  <div className='flex flex-col gap-1'>
    <p className='text-sm text-subtle'>Disabled</p>
    <ComponentName disabled />
  </div>
</div>
\```

### Composition

(if applicable) For compound components — show sub-components together.
Can also use "With [Feature]" naming: "With helper text", "With footer", etc.

## Guidelines

(if applicable, brief) When to use, when not to use, Oztix-specific notes.

<PropsDefinitions componentPath='packages/components/src/components/ComponentName/index.tsx' />
````

## Rules

1. **One-line description** — no "The X component is...". Just "A compact label for status and counts."
2. **Default first** — every Examples section starts with simplest usage
3. **Only include sections that apply** — no empty Intents on components that don't use it
4. **Intents** — only when intent visibly changes appearance at rest (Badge, Button, Card). Omit for form controls (Input, Textarea, Select, Field, RadioGroup)
5. **States** — for any interactive component. Single live example with labelled states
6. **Composition** — for compound components (Field, Card, Accordion, Breadcrumb, Select)
7. **Guidelines** — brief, only non-obvious things. Oztix context goes here
8. **No duplicates** — if disabled is in States, don't add separate Disabled section
9. **Minimal examples** — show only the feature. Layout with `flex flex-col gap-2` or `flex flex-row flex-wrap gap-2`
10. **State labels** — `<p className='text-sm text-subtle'>Label</p>` above each state

## Section applicability by category

| Section     | Actions | Forms | Data Display | Typography | Layout | Navigation | Media |
| ----------- | ------- | ----- | ------------ | ---------- | ------ | ---------- | ----- |
| Default     | yes     | yes   | yes          | yes        | yes    | yes        | yes   |
| Variants    | maybe   | maybe | maybe        | maybe      | maybe  | maybe      | maybe |
| Emphasis    | yes     | yes   | yes          | yes        | no     | no         | no    |
| Sizes       | yes     | yes   | yes          | yes        | no     | no         | no    |
| Intents     | yes     | no    | yes          | yes        | no     | no         | no    |
| States      | yes     | yes   | yes          | no         | no     | yes        | no    |
| Composition | no      | yes   | yes          | no         | no     | yes        | no    |
