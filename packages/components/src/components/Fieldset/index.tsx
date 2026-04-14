// Subpath entry for `@oztix/roadie-components/fieldset`.
//
// Base UI's exact shape — server-safe re-export of a namespace whose
// members are each individual client-module leaves on disk (enabled by
// tsdown unbundle mode). Consumers do:
//
//   import { Fieldset } from '@oztix/roadie-components/fieldset'
//   <Fieldset.Root>...</Fieldset.Root>
//
// and Next.js follows the static re-export chain at build time to resolve
// `Fieldset.Root` to a client reference pointing at `FieldsetRoot.tsx`.
//
// No `'use client'` directive here — this file is a pure server-safe
// re-export layer. Each leaf (`FieldsetRoot.tsx` et al.) carries its own
// `'use client'` where it's actually needed. See:
//   docs/solutions/rsc-patterns/compound-export-namespace.md
//   docs/contributing/COMPOUND_PATTERNS.md

export * as Fieldset from './parts'
