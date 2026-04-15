// Subpath entry for `@oztix/roadie-components/fieldset`.
//
// Zero-breaking-change shape: `Fieldset` is the root component (aliased to
// FieldsetRoot) with sub-components attached as static properties. Both
// `<Fieldset>...</Fieldset>` and `<Fieldset.Root>...</Fieldset.Root>` work,
// along with `<Fieldset.Legend>`, `<Fieldset.HelperText>`, etc.
//
// No `'use client'` directive here — this file is a server-safe module. The
// property-assignment form is classically broken across the Next.js RSC
// boundary (vercel/next.js#51593), but that failure mode requires the file
// to be a `'use client'` module wrapped in a client-reference proxy. Under
// tsdown `unbundle: true`, each leaf (`FieldsetRoot.tsx` et al.) is its own
// client module on disk, and this index file is a server-safe re-export
// layer that imports them by name. Property assignments happen in ordinary
// server-side JavaScript — no proxy is involved — so the attached
// sub-components are reachable from a server component that dots into
// `Fieldset.Legend`.
//
// See:
//   docs/solutions/rsc-patterns/compound-export-namespace.md
//   docs/contributing/COMPOUND_PATTERNS.md
import { FieldsetErrorText } from './FieldsetErrorText'
import { FieldsetHelperText } from './FieldsetHelperText'
import { FieldsetLegend } from './FieldsetLegend'
import { FieldsetRoot } from './FieldsetRoot'

const Fieldset = FieldsetRoot as typeof FieldsetRoot & {
  Root: typeof FieldsetRoot
  Legend: typeof FieldsetLegend
  HelperText: typeof FieldsetHelperText
  ErrorText: typeof FieldsetErrorText
}

Fieldset.Root = FieldsetRoot
Fieldset.Legend = FieldsetLegend
Fieldset.HelperText = FieldsetHelperText
Fieldset.ErrorText = FieldsetErrorText

export { Fieldset }
export type { FieldsetRootProps as FieldsetProps } from './FieldsetRoot'
export type { FieldsetLegendProps } from './FieldsetLegend'
export type { FieldsetHelperTextProps } from './FieldsetHelperText'
export type { FieldsetErrorTextProps } from './FieldsetErrorText'
