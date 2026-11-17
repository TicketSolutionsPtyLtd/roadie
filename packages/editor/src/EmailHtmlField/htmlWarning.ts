const URL_ATTRIBUTES = ['href', 'src', 'action', 'formaction', 'xlink:href']

// Browsers skip spaces and control characters around a scheme, and tabs and
// newlines inside it, but not a space.
function isJavascriptUrl(value: string) {
  const chars = [...value]
  const start = chars.findIndex((char) => char > ' ')
  if (start < 0) return false
  return chars
    .slice(start)
    .filter((char) => !'\t\n\r'.includes(char))
    .join('')
    .toLowerCase()
    .startsWith('javascript:')
}

// An attribute is a handler only when the element runs it, unlike `only`.
const isHandler = (element: Element, name: string) =>
  /^on[a-z]+$/.test(name) && name in element

/** Names what in the HTML runs code, which mail clients never run. */
export function htmlWarning(html: string): string | null {
  const page = new DOMParser().parseFromString(html, 'text/html')
  const handlers = new Set<string>()
  let scripts = false
  let javascriptLinks = false
  for (const element of page.querySelectorAll('*')) {
    if (element.localName === 'script') scripts = true
    for (const { name, value } of element.attributes) {
      if (isHandler(element, name)) handlers.add(name)
      if (URL_ATTRIBUTES.includes(name) && isJavascriptUrl(value)) {
        javascriptLinks = true
      }
    }
  }
  const found = [
    scripts && 'a script',
    handlers.size === 1 && `an ${[...handlers][0]} attribute`,
    handlers.size > 1 && `${list([...handlers])} attributes`,
    javascriptLinks && 'a javascript: link'
  ].filter((item): item is string => Boolean(item))
  if (found.length === 0) return null
  return `This HTML has ${list(found)}. Mail clients won't run its scripts, and the preview doesn't either.`
}

// Intl.ListFormat's en-AU adds a serial comma in WebKit only.
const list = (items: string[]) =>
  items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
