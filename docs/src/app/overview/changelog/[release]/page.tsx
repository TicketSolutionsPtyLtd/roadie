import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ReleaseMoved } from '@/components/changelog/ReleaseMoved'
import { ReleasePage } from '@/components/changelog/ReleasePage'
import { getReleaseViews, releaseRoutes } from '@/lib/releases'

type Props = { params: Promise<{ release: string }> }

export const dynamicParams = false

const routeOf = (slug: string) =>
  releaseRoutes(getReleaseViews()).find((route) => route.slug === slug)

export function generateStaticParams() {
  return releaseRoutes(getReleaseViews()).map(({ slug }) => ({ release: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { release: slug } = await params
  const route = routeOf(slug)
  if (route?.movedTo)
    return { title: 'Release moved · Changelog', robots: { index: false } }
  const release = getReleaseViews().find((view) => view.slug === slug)
  if (!release) return {}
  return {
    title: `${release.headlines.all.title} · Changelog`,
    description: release.headlines.all.summary
  }
}

export default async function Release({ params }: Props) {
  const { release: slug } = await params
  const route = routeOf(slug)
  if (!route) notFound()
  if (route.movedTo) return <ReleaseMoved href={route.movedTo} />
  return <ReleasePage slug={slug} />
}
