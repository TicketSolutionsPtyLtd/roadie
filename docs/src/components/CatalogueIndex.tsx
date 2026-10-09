import { CataloguePreview } from '@/components/CataloguePreview'
import { ComponentBrowser } from '@/components/ComponentBrowser'
import { PreviewCard, PreviewSection } from '@/components/PreviewGrid'
import { CATALOGUE_PAGES, getCatalogue } from '@/lib/page-manifest'

/** A catalogue's pages as preview cards by category, or as a searchable list. The markdown twin lists the same links. */
export async function CatalogueIndex({
  name,
  searchable
}: {
  name: keyof typeof CATALOGUE_PAGES
  searchable?: boolean
}) {
  if (!Object.hasOwn(CATALOGUE_PAGES, name))
    throw new Error(`<CatalogueIndex name="${name}"> names no catalogue`)
  const catalogue = CATALOGUE_PAGES[name]
  const categories = await getCatalogue(catalogue)

  return (
    <div data-not-prose className='@container grid gap-10'>
      {searchable ? (
        <ComponentBrowser categories={categories} />
      ) : (
        categories.map((category) => (
          <PreviewSection key={category.name} title={category.name}>
            {category.entries.map((entry) => (
              <PreviewCard
                key={entry.name}
                href={entry.href}
                title={entry.title}
              >
                <CataloguePreview route={catalogue.route} entry={entry} />
              </PreviewCard>
            ))}
          </PreviewSection>
        ))
      )}
    </div>
  )
}
