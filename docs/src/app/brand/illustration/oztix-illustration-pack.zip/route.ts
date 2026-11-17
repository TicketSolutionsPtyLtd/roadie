import { illustrationPack } from '@/lib/spot-sources'

export const dynamic = 'force-static'

export async function GET() {
  return new Response(new Blob([await illustrationPack()]), {
    headers: { 'Content-Type': 'application/zip' }
  })
}
