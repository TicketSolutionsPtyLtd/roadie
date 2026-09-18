import { ComponentBrowser } from '@/components/ComponentBrowser'
import { COMPONENTS, getCatalogue } from '@/lib/page-manifest'

export const metadata = {
  title: 'Components',
  description:
    'Accessible React components built on Base UI, styled with intent and emphasis.'
}

export default async function ComponentsPage() {
  const categories = await getCatalogue(COMPONENTS)

  return (
    <div className='grid gap-8'>
      <p className='text-lg text-subtle'>{metadata.description}</p>
      <ComponentBrowser categories={categories} />
    </div>
  )
}
