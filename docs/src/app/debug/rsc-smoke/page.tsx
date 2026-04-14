// Permanent RSC canary page. This file MUST remain a React Server Component
// (no 'use client' directive) — its entire purpose is to prove that every
// Pattern A compound renders from a server component via its subpath import
// without falling back to the PR #38 client-wrapper workaround.
//
// Any compound that regresses from RSC-safe causes the docs build to fail
// with "Element type is invalid". See:
//   docs/contributing/COMPOUND_PATTERNS.md
//   docs/solutions/rsc-patterns/compound-export-namespace.md
import * as Fieldset from '@oztix/roadie-components/fieldset'

export default function RscSmokePage() {
  return (
    <main className='mx-auto grid max-w-3xl gap-8 p-8'>
      <header className='grid gap-2'>
        <h1 className='text-display-prose-1 text-strong'>RSC smoke test</h1>
        <p className='text-subtle'>
          Every migrated compound renders below from a server component — no
          client wrapper, no barrel import — using only the per-compound
          subpath. If the docs build succeeds, each compound is RSC-safe.
        </p>
      </header>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Fieldset</h2>
        <Fieldset.Root>
          <Fieldset.Legend>Contact information</Fieldset.Legend>
          <Fieldset.HelperText>
            Renders from a server component via{' '}
            <code>@oztix/roadie-components/fieldset</code>.
          </Fieldset.HelperText>
        </Fieldset.Root>
        <Fieldset.Root invalid>
          <Fieldset.Legend>Invalid fieldset</Fieldset.Legend>
          <Fieldset.ErrorText>
            ErrorText only renders when the root is marked <code>invalid</code>.
          </Fieldset.ErrorText>
        </Fieldset.Root>
      </section>

      {/*
        Phase 3 follow-up: as each compound migrates to Pattern A, add a
        <Compound.Root /> section here referencing the new subpath import.
      */}
    </main>
  )
}
