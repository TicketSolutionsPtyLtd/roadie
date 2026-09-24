export const SVG_NS = 'http://www.w3.org/2000/svg'
export const FONT_FAMILY = 'Intermission,system-ui,sans-serif'

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

export const escapeXml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ENTITIES[char]!)
