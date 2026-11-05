import ts from 'typescript'

export const SOURCE_COMMENT_FILES = [
  'ts',
  'tsx',
  'js',
  'mjs',
  'css',
  'vue'
].map((extension) => `:(glob)packages/*/src/**/*.${extension}`)

const SCRIPT_KINDS = {
  ts: ts.ScriptKind.TS,
  tsx: ts.ScriptKind.TSX,
  js: ts.ScriptKind.JSX,
  mjs: ts.ScriptKind.JSX
}

// Every comment the TypeScript parser keeps as trivia, including JSX's
// `{/* … */}`, as [start, end] offsets.
function scriptComments(source, kind) {
  const file = ts.createSourceFile(
    'file',
    source,
    ts.ScriptTarget.Latest,
    true,
    kind
  )
  const ranges = new Map()
  const collect = (list) => {
    for (const { pos, end } of list ?? []) ranges.set(pos, [pos, end])
  }
  const visit = (node) => {
    collect(ts.getLeadingCommentRanges(source, node.pos))
    collect(ts.getTrailingCommentRanges(source, node.end))
    for (const child of node.getChildren(file)) visit(child)
  }
  visit(file)
  return [...ranges.values()]
}

const regexComments = (source, pattern, offset = 0) =>
  [...source.matchAll(pattern)].map(({ index, 0: text }) => [
    offset + index,
    offset + index + text.length
  ])

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g
const HTML_COMMENT = /<!--[\s\S]*?-->/g
const VUE_BLOCK = /(<(script|style)\b[^>]*>)([\s\S]*?)<\/\2>/g

function vueComments(source) {
  const blocks = [...source.matchAll(VUE_BLOCK)]
  const outside = blocks.reduce(
    (text, { index, 0: block }) =>
      text.slice(0, index) +
      ' '.repeat(block.length) +
      text.slice(index + block.length),
    source
  )
  return [
    ...regexComments(outside, HTML_COMMENT),
    ...blocks.flatMap(({ index, 1: open, 2: tag, 3: body }) => {
      const offset = index + open.length
      return tag === 'style'
        ? regexComments(body, CSS_COMMENT, offset)
        : scriptComments(body, ts.ScriptKind.TS).map(([start, end]) => [
            offset + start,
            offset + end
          ])
    })
  ]
}

export function commentRanges(file, source) {
  const extension = file.slice(file.lastIndexOf('.') + 1)
  if (extension === 'css') return regexComments(source, CSS_COMMENT)
  if (extension === 'vue') return vueComments(source)
  return scriptComments(source, SCRIPT_KINDS[extension] ?? ts.ScriptKind.TS)
}

const EM_DASH = '—'

export function commentEmDashFindings(file, source) {
  const lineStarts = [0]
  for (let index = 0; index < source.length; index++)
    if (source[index] === '\n') lineStarts.push(index + 1)
  const lineOf = (offset) =>
    lineStarts.findLastIndex((start) => start <= offset) + 1
  const lines = new Set()
  for (const [start, end] of commentRanges(file, source)) {
    let at = source.indexOf(EM_DASH, start)
    while (at !== -1 && at < end) {
      lines.add(lineOf(at))
      at = source.indexOf(EM_DASH, at + 1)
    }
  }
  return [...lines]
    .sort((a, b) => a - b)
    .map((line) => ({
      file,
      line,
      message:
        'Em dash in a comment. Use a colon, comma, full stop, or brackets.'
    }))
}
