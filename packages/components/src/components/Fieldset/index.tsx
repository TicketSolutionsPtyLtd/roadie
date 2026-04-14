'use client'

// Subpath entry for `@oztix/roadie-components/fieldset`.
//
// The library exposes flat, top-level named exports (`Root`, `Legend`,
// `HelperText`, `ErrorText`). Consumers write `import * as Fieldset from
// '@oztix/roadie-components/fieldset'` and dot into a _consumer-side_
// namespace, whose members resolve at compile time to the library's
// top-level exports. Each member becomes its own client reference across
// the Next.js RSC boundary, so `<Fieldset.Root />` in a server component
// is a compile-time property access — not a runtime proxy dot access —
// and sidesteps the property-assignment client-reference-proxy bug
// tracked in `docs/solutions/rsc-patterns/compound-export-namespace.md`.
//
// Authoring rules for compounds live in
// `docs/contributing/COMPOUND_PATTERNS.md`.

export * from './parts'
