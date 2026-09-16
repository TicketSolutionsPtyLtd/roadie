import { readFile } from 'fs/promises'
import { join } from 'path'

export const CHANGELOG_URL =
  'https://github.com/ticketsolutionsptyltd/roadie/blob/main/packages/components/CHANGELOG.md'

const CHANGELOG_PATH = join(
  process.cwd(),
  '../packages/components/CHANGELOG.md'
)

export type Release = { version: string; changes: string[] }

const MAX_HEADLINE = 160

/** A change's first sentence, without its changeset hash or bold markers. */
function headline(entry: string): string | null {
  if (entry.startsWith('Updated dependencies')) return null
  const [paragraph = ''] = entry
    .replace(/^[0-9a-f]{7}: (- )?/, '')
    .split(/\n\s*\n/)
  const text = paragraph.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
  const sentence = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text
  if (sentence.length <= MAX_HEADLINE) return sentence
  let cut = sentence.slice(0, sentence.lastIndexOf(' ', MAX_HEADLINE - 1))
  // Never end inside inline code.
  if ((cut.match(/`/g)?.length ?? 0) % 2 === 1) {
    cut = cut.slice(0, cut.lastIndexOf('`')).trimEnd()
  }
  return `${cut}…`
}

function parseRelease(block: string): Release {
  const [version = '', ...lines] = block.split('\n')
  const changes = lines
    .join('\n')
    .split(/^- /m)
    .slice(1)
    .map(headline)
    .filter((change) => change !== null)
  return { version: version.trim(), changes }
}

/** The newest releases of the components package, read at build time. */
export async function getRecentReleases(count: number): Promise<Release[]> {
  const markdown = await readFile(CHANGELOG_PATH, 'utf-8')
  return markdown
    .split(/^## /m)
    .slice(1)
    .map(parseRelease)
    .filter((release) => release.changes.length > 0)
    .slice(0, count)
}
