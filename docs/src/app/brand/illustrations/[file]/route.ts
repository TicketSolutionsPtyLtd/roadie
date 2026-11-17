import { spotSource } from '@/lib/spot-sources'

import { SPOT_ILLUSTRATIONS } from '@oztix/roadie-illustrations/spot/catalogue'

export const dynamic = 'force-static'
export const dynamicParams = false

type Context = { params: Promise<{ file: string }> }

export function generateStaticParams() {
  return SPOT_ILLUSTRATIONS.map(({ slug }) => ({ file: `${slug}.svg` }))
}

export async function GET(_request: Request, { params }: Context) {
  const { file } = await params
  return new Response(await spotSource(file.replace(/\.svg$/, '')), {
    headers: { 'Content-Type': 'image/svg+xml' }
  })
}
