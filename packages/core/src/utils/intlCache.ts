type IntlConstructor<Options, Formatter> = new (
  locale: string,
  options: Options
) => Formatter

// Keyed by the constructor too, so a replaced Intl constructor (a polyfill,
// a test double) never serves formatters built by the old one.
const caches = new WeakMap<object, Map<string, unknown>>()

// Locale, time zone and currency come from callers, so each cache drops its
// oldest formatter rather than grow for the life of the process.
const MAX_FORMATTERS = 200

/**
 * A shared Intl formatter for a locale and option set. Building one costs far
 * more than formatting with it, and a table formats hundreds of values with
 * the same few option sets. A constructor that throws caches nothing.
 */
export function intlFormatter<Options, Formatter>(
  Format: IntlConstructor<Options, Formatter>,
  locale: string,
  options: Options
): Formatter {
  let cache = caches.get(Format) as Map<string, Formatter> | undefined
  if (!cache) {
    cache = new Map()
    caches.set(Format, cache)
  }
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = cache.get(key)
  if (!formatter) {
    formatter = new Format(locale, options)
    if (cache.size >= MAX_FORMATTERS)
      cache.delete(cache.keys().next().value as string)
    cache.set(key, formatter)
  }
  return formatter
}
