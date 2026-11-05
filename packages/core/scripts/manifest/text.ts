export function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

export function unwrap(text: string) {
  return text
    .replace(/([^\n])\n(?!\n)/g, '$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
