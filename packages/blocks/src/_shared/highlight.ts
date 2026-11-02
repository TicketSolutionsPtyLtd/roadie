// A live preview, such as Sanity's Presentation tool, appends a source map to
// every string in zero-width characters, so a highlight would never match its title.
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF]/g

/** The words to highlight, without a live preview's invisible characters. */
export function cleanHighlight(
  highlight: string | readonly string[]
): string | string[] {
  return typeof highlight === 'string'
    ? highlight.replace(INVISIBLE, '')
    : highlight.map((words) => words.replace(INVISIBLE, ''))
}
