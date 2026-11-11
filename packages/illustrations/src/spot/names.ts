/** An illustration's component name, from its file name: `arrow-up-right` is `ArrowUpRight`. */
export const componentName = (slug: string) =>
  slug.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase())

/** An illustration's name in words, from its file name: `letter-a` is `Letter A`. */
export function labelOf(slug: string) {
  const words = slug
    .split('-')
    .map((word) => (word.length === 1 ? word.toUpperCase() : word))
  const [first = '', ...rest] = words
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ')
}
