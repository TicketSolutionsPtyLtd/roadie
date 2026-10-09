/** Drops the blank lines around `source` and the indent its lines share. */
export function dedent(source: string) {
  const lines = source.replace(/^\s*\n|\s+$/g, '').split('\n')
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim())
      .map((line) => line.match(/^ */)![0].length)
  )
  return lines.map((line) => line.slice(indent)).join('\n')
}
