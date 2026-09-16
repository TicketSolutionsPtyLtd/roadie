import type { TokenEntry, TokenFamily } from '@roadie-core/tokens'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { TOKEN_FAMILY_PAGES } from './token-families'

export type { TokenEntry, TokenFamily }

const MANIFEST = join(process.cwd(), '../packages/core/src/tokens/tokens.json')

/** Every token core ships, as `generate:tokens` last wrote them. */
export async function getTokens(): Promise<TokenEntry[]> {
  let raw: string
  try {
    raw = await readFile(MANIFEST, 'utf-8')
  } catch {
    throw new Error(
      'No token manifest. Run `pnpm --filter @oztix/roadie-core generate:tokens`.'
    )
  }
  const { tokens } = JSON.parse(raw) as { tokens: TokenEntry[] }
  const orphans = tokens.filter(
    (token) => !(token.family in TOKEN_FAMILY_PAGES)
  )
  if (orphans.length > 0) {
    throw new Error(
      `Tokens with no reference page: ${orphans.map((t) => t.name).join(', ')}`
    )
  }
  return tokens
}

export async function getFamilyTokens(family: TokenFamily) {
  return (await getTokens()).filter((token) => token.family === family)
}
