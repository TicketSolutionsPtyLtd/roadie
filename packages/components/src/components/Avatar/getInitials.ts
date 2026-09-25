const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : undefined

function firstGrapheme(word: string): string {
  if (!segmenter) return Array.from(word)[0] ?? ''
  return segmenter.segment(word)[Symbol.iterator]().next().value?.segment ?? ''
}

/** First letter of the first and last words, e.g. `'Mia van Tran'` → `'MT'`. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]
  const last = words.length > 1 ? words[words.length - 1] : undefined
  // Locale-free casing so server and browser render the same initials.
  return [first, last]
    .map((word) => (word ? firstGrapheme(word) : ''))
    .join('')
    .toUpperCase()
}
