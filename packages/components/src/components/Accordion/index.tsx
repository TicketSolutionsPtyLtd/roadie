// Subpath entry for `@oztix/roadie-components/accordion`.
//
// NO `'use client'` — this file is a server-safe module under tsdown
// `unbundle: true`. It imports each leaf by name and attaches them to the
// root function via property assignment. Adding `'use client'` here
// reinstates the Next.js client-reference-proxy wall and breaks
// `<Accordion.Item>` in server components.
//
// See:
//   docs/contributing/COMPOUND_PATTERNS.md
//   docs/solutions/rsc-patterns/compound-export-namespace.md
import { AccordionContent } from './AccordionContent'
import { AccordionItem } from './AccordionItem'
import { AccordionRoot } from './AccordionRoot'
import { AccordionTrigger } from './AccordionTrigger'

const Accordion = AccordionRoot as typeof AccordionRoot & {
  Root: typeof AccordionRoot
  Item: typeof AccordionItem
  Trigger: typeof AccordionTrigger
  Content: typeof AccordionContent
}

Accordion.Root = AccordionRoot
Accordion.Item = AccordionItem
Accordion.Trigger = AccordionTrigger
Accordion.Content = AccordionContent

export { Accordion }
export type { AccordionRootProps as AccordionProps } from './AccordionRoot'
export { accordionVariants } from './variants'
