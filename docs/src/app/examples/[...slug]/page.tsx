import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { IsolatedExample } from '@/components/IsolatedExample'
import { getLiveExample, getLiveExamples } from '@/lib/example-manifest'

export const dynamicParams = false

type Props = { params: Promise<{ slug: string[] }> }

export async function generateStaticParams() {
  return (await getLiveExamples()).map(({ page, id }) => ({
    slug: [...page.split('/'), id]
  }))
}

async function exampleFor(params: Props['params']) {
  const { slug } = await params
  return getLiveExample(slug.slice(0, -1).join('/'), slug.at(-1) ?? '')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const example = await exampleFor(params)
  if (!example) return {}
  const name = example.heading ?? example.pageTitle
  return {
    title: `${name} example, ${example.pageTitle} | Roadie Design System`,
    robots: { index: false }
  }
}

export default async function ExamplePage({ params }: Props) {
  const example = await exampleFor(params)
  if (!example) notFound()
  return <IsolatedExample {...example} />
}
