// Permanent RSC canary. This file MUST remain a React Server Component —
// its entire purpose is to prove that every migrated compound renders from a
// server component via both the subpath import and the barrel, using the
// canonical bare root form (`<Fieldset>`) AND the Base UI-style explicit
// `<Fieldset.Root>` alias. Both forms reference the same client component.
//
// A regression surfaces here as "Element type is invalid" at prerender time
// and fails the docs build. See:
//   docs/contributing/COMPOUND_PATTERNS.md
//   docs/solutions/rsc-patterns/compound-export-namespace.md
import { Fieldset as FieldsetViaBarrel } from '@oztix/roadie-components'
import { Accordion } from '@oztix/roadie-components/accordion'
import { Fieldset } from '@oztix/roadie-components/fieldset'
import { RadioGroup } from '@oztix/roadie-components/radio-group'

export default function RscSmokePage() {
  return (
    <main className='mx-auto grid max-w-3xl gap-8 p-8'>
      <header className='grid gap-2'>
        <h1 className='text-display-prose-1 text-strong'>RSC smoke test</h1>
        <p className='text-subtle'>
          Every migrated compound renders below from a server component. Each
          compound is tested via the bare root form (canonical), the explicit{' '}
          <code>.Root</code> alias, and the root barrel import. If the docs
          build succeeds, every compound on this page is RSC-safe.
        </p>
      </header>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Fieldset — bare root (canonical)
        </h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Fieldset &#125; from
            &apos;@oztix/roadie-components/fieldset&apos;
          </code>
        </p>
        <Fieldset>
          <Fieldset.Legend>Contact information</Fieldset.Legend>
          <Fieldset.HelperText>
            Renders from a server component via the bare root form.
          </Fieldset.HelperText>
        </Fieldset>
        <Fieldset invalid>
          <Fieldset.Legend>Invalid fieldset</Fieldset.Legend>
          <Fieldset.ErrorText>
            ErrorText only renders when the root is marked <code>invalid</code>.
          </Fieldset.ErrorText>
        </Fieldset>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Fieldset — <code>.Root</code> alias
        </h2>
        <p className='text-sm text-subtle'>
          Explicit <code>&lt;Fieldset.Root&gt;</code> form — same component
          reference as bare <code>&lt;Fieldset&gt;</code>, supported for
          consumers who prefer Base UI&apos;s explicit root syntax.
        </p>
        <Fieldset.Root>
          <Fieldset.Legend>Explicit root</Fieldset.Legend>
          <Fieldset.HelperText>
            <code>&lt;Fieldset.Root&gt;</code> and bare{' '}
            <code>&lt;Fieldset&gt;</code> are the same function — proves the
            alias works from a server component.
          </Fieldset.HelperText>
        </Fieldset.Root>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Fieldset — barrel</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Fieldset &#125; from
            &apos;@oztix/roadie-components&apos;
          </code>
        </p>
        <FieldsetViaBarrel>
          <FieldsetViaBarrel.Legend>
            Imported from the root barrel
          </FieldsetViaBarrel.Legend>
          <FieldsetViaBarrel.HelperText>
            Confirms the barrel re-exports the compound without breaking the
            server-safe re-export chain down to each leaf.
          </FieldsetViaBarrel.HelperText>
        </FieldsetViaBarrel>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Accordion</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; Accordion &#125; from
            &apos;@oztix/roadie-components/accordion&apos;
          </code>
        </p>
        <Accordion>
          <Accordion.Item>
            <Accordion.Trigger>What is an Accordion?</Accordion.Trigger>
            <Accordion.Content>
              A native <code>&lt;details&gt;</code> /{' '}
              <code>&lt;summary&gt;</code> wrapper with Roadie styling. Renders
              from a server component via the subpath import.
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Trigger>Why per-file?</Accordion.Trigger>
            <Accordion.Content>
              Each leaf is its own on-disk module so Next.js can follow the
              server-safe re-export chain at build time.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </section>

      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>RadioGroup</h2>
        <p className='text-sm text-subtle'>
          <code>
            import &#123; RadioGroup &#125; from
            &apos;@oztix/roadie-components/radio-group&apos;
          </code>
        </p>
        <RadioGroup>
          <RadioGroup.Label>Contact method</RadioGroup.Label>
          <RadioGroup.Item value='email' label='Email' />
          <RadioGroup.Item value='phone' label='Phone' />
          <RadioGroup.HelperText>Choose how we reach you.</RadioGroup.HelperText>
        </RadioGroup>
      </section>

      {/*
        Phase 3 follow-up: as each compound migrates, add a section here
        rendering its bare <Compound /> via the subpath + barrel imports.
      */}
    </main>
  )
}
