import type { Metadata } from 'next'

import { IsolatedExampleRoute } from '@/components/IsolatedExample'
import { EXAMPLE_SHELL } from '@/lib/example-code'
import { getLiveExamples } from '@/lib/example-manifest'

export const dynamicParams = false

// Not the layout's title: IsolatedExampleRoute renders the example's, and two compete.
export const metadata: Metadata = {
  title: null,
  robots: { index: false }
}

// A build renders one shell for scripts/example-pages.ts to copy; `next dev` has no such step.
export async function generateStaticParams() {
  if (process.env.NODE_ENV !== 'development') return [{ slug: [EXAMPLE_SHELL] }]
  return (await getLiveExamples()).map(({ page, id }) => ({
    slug: [...page.split('/'), id]
  }))
}

export default function ExamplePage() {
  return <IsolatedExampleRoute />
}
