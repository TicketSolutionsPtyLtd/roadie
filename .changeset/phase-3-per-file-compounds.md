---
'@oztix/roadie-components': minor
---

Phase 3 of the `2026-04-15-refactor-components-consistency-cleanup-plan`. Every compound in the package is now **RSC-safe by construction**: consumers can render `<Fieldset>`, `<Accordion>`, `<Card>`, `<Carousel>`, `<Combobox>`, `<Select>`, `<Autocomplete>`, `<RadioGroup>`, `<Steps>`, `<Field>`, `<Breadcrumb>` — and dot into their sub-components like `<Accordion.Item>`, `<Select.Trigger>`, `<Carousel.Content>` — from a Next.js server component, via either the root barrel or the new per-compound subpath entries. The minor bump is for the new subpath surface and the new `.Root` alias; the bare-root consumer form (`<Compound>`) is unchanged so **nothing existing breaks**.

**Zero breaking change.** `Fieldset === Fieldset.Root` (same function reference), and every other compound follows suit. Existing code using bare `<Fieldset>` / `<Card>` / `<Accordion>` works exactly as before. `.Root` is a Base UI-parity alias, not a required migration.

**New subpath entries.** Every compound ships from its own subpath (`@oztix/roadie-components/fieldset`, `/card`, `/accordion`, `/select`, `/combobox`, `/autocomplete`, `/radio-group`, `/carousel`, `/steps`, `/field`, `/breadcrumb`, …). 24 subpath keys generated into `package.json`'s `exports` block. Subpath form is preferred in Next.js consumers because it scopes the compiler walk to one compound.

**New: `data-slot` attribute on every rendered DOM element.** Shadcn-style addressable markers — `<Fieldset.Legend>` renders `data-slot="fieldset-legend"`, `<Carousel.NavButton>` renders `data-slot="carousel-nav-button"`. Consumers can target these in CSS, Tailwind variants, visual regression tooling, and tests without depending on internal class names.

**New sub-component prop-type exports on the barrel.** Breadcrumb, Card, Field, Steps, Autocomplete, Combobox, Select, Carousel, RadioGroup, Fieldset, Accordion all now export their full per-sub-component prop type surface (e.g. `BreadcrumbListProps`, `CardHeaderProps`, `SelectTriggerProps`, `CarouselContentProps`, `StepsItemProps`, etc.) for consumers annotating custom wrappers.

**Build shape: tsdown `unbundle: true`.** Previously the components package bundled each compound folder into a single dist file; it now emits one dist file per source file, preserving the source directory structure 1:1 under `dist/components/<Compound>/`. Rolldown (tsdown's backend) preserves `'use client'` on per-file outputs natively, so the directive stays exactly where it's marked in source. Each compound's `index.tsx` ships **without** `'use client'` — it's a server-safe property-assignment layer that Next.js can follow through to each leaf at build time. This is the load-bearing change that makes dot-access work across the RSC boundary.

**11 compounds migrated** (pilot + follow-ups): Fieldset, Accordion, RadioGroup, Breadcrumb, Card, Steps, Field, Select, Autocomplete, Combobox, Carousel. Every compound folder now contains per-file sub-component leaves, a shared `*Context.ts` where needed, `variants.ts` where it has CVA maps, a server-safe `index.tsx` attachment layer, and a test file exercising both `<Compound>` (canonical) and `<Compound.Root>` (alias) forms.

Full rationale, the three rejected attempts, and the authoring checklist for new compounds are in [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../docs/solutions/rsc-patterns/compound-export-namespace.md) and [`docs/contributing/COMPOUND_PATTERNS.md`](../docs/contributing/COMPOUND_PATTERNS.md).
