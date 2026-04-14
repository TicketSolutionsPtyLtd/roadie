// Permanent RSC canary. This file MUST remain a React Server Component —
// its entire purpose is to prove that every migrated compound renders from a
// server component via both the subpath import and the barrel, using Base
// UI's bare `import { Compound }` form with `<Compound.Root>` dot access.
//
// A regression surfaces here as "Element type is invalid" at prerender time
// and fails the docs build. See:
//   docs/contributing/COMPOUND_PATTERNS.md
//   docs/solutions/rsc-patterns/compound-export-namespace.md
import { Fieldset as FieldsetViaBarrel } from '@oztix/roadie-components'
import { Fieldset } from '@oztix/roadie-components/fieldset'

export default function RscSmokePage() {
  return (
    <main className='mx-auto grid max-w-3xl gap-8 p-8'>
      <header className='grid gap-2'>
        <h1 className='text-display-prose-1 text-strong'>RSC smoke test</h1>
        <p className='text-subtle'>
          Every migrated compound renders below from a server component. Each
          compound is tested via both the per-compound subpath import (the
          canonical form) and the root barrel import. If the docs build
          succeeds, every compound on this page is RSC-safe.
        </p>
      </header>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Fieldset — subpath</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Fieldset &#125; from
            &apos;@oztix/roadie-components/fieldset&apos;
          </code>
        </p>
        <Fieldset.Root>
          <Fieldset.Legend>Contact information</Fieldset.Legend>
          <Fieldset.HelperText>
            Renders from a server component via the per-compound subpath.
          </Fieldset.HelperText>
        </Fieldset.Root>
        <Fieldset.Root invalid>
          <Fieldset.Legend>Invalid fieldset</Fieldset.Legend>
          <Fieldset.ErrorText>
            ErrorText only renders when the root is marked <code>invalid</code>.
          </Fieldset.ErrorText>
        </Fieldset.Root>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Fieldset — barrel</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Fieldset &#125; from &apos;@oztix/roadie-components&apos;
          </code>
        </p>
        <FieldsetViaBarrel.Root>
          <FieldsetViaBarrel.Legend>
            Imported from the root barrel
          </FieldsetViaBarrel.Legend>
          <FieldsetViaBarrel.HelperText>
            Confirms the barrel re-exports the compound namespace without
            breaking the server-safe re-export chain down to each leaf.
          </FieldsetViaBarrel.HelperText>
        </FieldsetViaBarrel.Root>
      </section>

      {/*
        Phase 3 follow-up: as each compound migrates, add a section here
        rendering its <Compound.Root /> via the subpath + barrel imports.
      */}
    </main>
  )
}
