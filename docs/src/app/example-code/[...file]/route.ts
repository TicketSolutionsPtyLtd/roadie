import { getLiveExamples } from '@/lib/example-manifest'

export const dynamic = 'force-static'
export const dynamicParams = false

type Context = { params: Promise<{ file: string[] }> }

export async function generateStaticParams() {
  const pages = new Set((await getLiveExamples()).map(({ page }) => page))
  return [...pages].map((page) => ({ file: `${page}.json`.split('/') }))
}

export async function GET(_request: Request, { params }: Context) {
  const page = (await params).file.join('/').replace(/\.json$/, '')
  return Response.json(
    (await getLiveExamples()).filter((example) => example.page === page)
  )
}
