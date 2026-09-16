import { FoundationPreview } from '@/components/FoundationPreview'
import { PreviewCard, PreviewSection } from '@/components/PreviewGrid'
import { FOUNDATIONS, getCatalogue } from '@/lib/page-manifest'

export const metadata = {
  title: 'Foundations',
  description:
    'The principles and conventions every Roadie component builds on.'
}

export default async function FoundationsPage() {
  const categories = await getCatalogue(FOUNDATIONS)

  return (
    <div className='@container grid gap-10'>
      <p className='text-lg text-subtle'>{metadata.description}</p>
      {categories.map((category) => (
        <PreviewSection key={category.name} title={category.name}>
          {category.entries.map((entry) => (
            <PreviewCard key={entry.name} href={entry.href} title={entry.title}>
              <FoundationPreview name={entry.name} />
            </PreviewCard>
          ))}
        </PreviewSection>
      ))}
    </div>
  )
}
