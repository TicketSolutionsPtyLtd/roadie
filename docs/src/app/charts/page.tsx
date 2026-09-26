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

const STATIC_EXAMPLE = `import { lineChart, renderChartSvg } from '@oztix/roadie-charts/static'

const svg = renderChartSvg(lineChart, pace, {
  mode: 'light',
  width: 640,
  height: 260
})`

const TABLES_EXAMPLE = `import { lineChartTable } from '@oztix/roadie-charts/tables'

const { columns, rows } = lineChartTable(pace)`

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

      <section aria-labelledby='static-and-tables' className='grid gap-4'>
        <h2 id='static-and-tables' className='text-display-ui-4 text-strong'>
          Static and tables
        </h2>
        <p>
          <Code>@oztix/roadie-charts/static</Code> draws any chart as a
          standalone SVG file for reports, PDFs and slides. Pass{' '}
          <Code>renderChartSvg</Code> a chart definition, such as{' '}
          <Code>lineChart</Code>, the same props the live chart takes, a mode
          and a size. The file carries its own font, colours and accessible
          name, so it reads the same outside the app.
        </p>
        <CodePreview language='tsx'>{STATIC_EXAMPLE}</CodePreview>
        <p>
          <Code>@oztix/roadie-charts/tables</Code> builds the rows behind each
          chart&apos;s Table view without loading the chart engine. Call it on
          the server to send exact numbers with a report, or to fill a{' '}
          <Code>DataTable</Code>. For a dashboard description,{' '}
          <Code>plotTable</Code> takes any chart card&apos;s <Code>plot</Code>,
          and <Code>cardTable</Code> takes a whole card and returns its table,
          ready for an action such as Download CSV.
        </p>
        <CodePreview language='tsx'>{TABLES_EXAMPLE}</CodePreview>
      </section>
    </div>
  )
}
