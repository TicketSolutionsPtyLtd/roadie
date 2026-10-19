import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ReleasePage } from '@/components/changelog/ReleasePage'
import { getReleaseViews } from '@/lib/releases'

type Props = { params: Promise<{ release: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return getReleaseViews().map(({ slug }) => ({ release: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { release: slug } = await params
  const release = getReleaseViews().find((view) => view.slug === slug)
  if (!release) return {}
  return {
    title: `${release.headlines.all.title} · Changelog`,
    description: release.headlines.all.summary
  }
}

export default async function Release({ params }: Props) {
  const { release: slug } = await params
  if (!getReleaseViews().some((view) => view.slug === slug)) notFound()
  return <ReleasePage slug={slug} />
}
