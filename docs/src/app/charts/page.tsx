import Link from 'next/link'

import { ChartPreview } from '@/components/ChartPreview'
import { CodePreview } from '@/components/CodePreview'
import { PreviewCard, PreviewSection } from '@/components/PreviewGrid'
import { CHARTS, getCatalogue } from '@/lib/page-manifest'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Charts',
  description:
    'Build dashboards and charts that read the same in every Oztix app'
}

const STYLESHEETS = `@import '@oztix/roadie-core/css';
@import '@oztix/roadie-components/css';
@import '@oztix/roadie-charts/css';`

export default async function ChartsPage() {
  const categories = await getCatalogue(CHARTS)

  return (
    <div className='@container grid gap-10'>
      <p className='text-lg text-subtle'>{metadata.description}</p>
      {categories.map((category) => (
        <PreviewSection key={category.name} title={category.name}>
          {category.entries.map((entry) => (
            <PreviewCard key={entry.name} href={entry.href} title={entry.title}>
              <ChartPreview name={entry.name} />
            </PreviewCard>
          ))}
        </PreviewSection>
      ))}

      <section aria-labelledby='setup' className='grid gap-4'>
        <h2 id='setup' className='text-display-ui-4 text-strong'>
          Setup
        </h2>
        <p>
          Pieces that work anywhere, such as <Code>StatTile</Code> and{' '}
          <Code>DataTable</Code>, ship from{' '}
          <Code>@oztix/roadie-components</Code>. The chart frame and{' '}
          <Code>DashboardView</Code> ship from <Code>@oztix/roadie-charts</Code>
          . Import every stylesheet you use.
        </p>
        <CodePreview language='css'>{STYLESHEETS}</CodePreview>
        <p>
          Describe any dashboard as JSON and check it with{' '}
          <Code>validateDashboard</Code> from{' '}
          <Code>@oztix/roadie-core/dashboard</Code>. The{' '}
          <Link href='/charts/show-dashboard' className='underline'>
            reference dashboards
          </Link>{' '}
          are written this way.
        </p>
      </section>
    </div>
  )
}
