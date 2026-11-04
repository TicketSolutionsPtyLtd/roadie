import type { Metadata } from 'next'

import { IsolatedExampleRoute } from '@/components/IsolatedExample'
import { EXAMPLE_SHELL } from '@/lib/example-code'
import { getLiveExamples } from '@/lib/example-manifest'

export const dynamicParams = false

// No title: IsolatedExampleRoute renders the example's own once it loads,
// and a title from here would compete with it.
export const metadata: Metadata = {
  title: null,
  robots: { index: false }
}

// Every example page is the same shell, which reads its example in the
// browser. A build renders it once, and scripts/example-pages.ts copies it to
// each example's address; `next dev` serves each address itself.
export async function generateStaticParams() {
  if (process.env.NODE_ENV !== 'development') return [{ slug: [EXAMPLE_SHELL] }]
  return (await getLiveExamples()).map(({ page, id }) => ({
    slug: [...page.split('/'), id]
  }))
}

export default function ExamplePage() {
  return <IsolatedExampleRoute />
}
