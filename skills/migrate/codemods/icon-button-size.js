import {
  attribute,
  jsxNameMatcher,
  print,
  setStringValue,
  stringValue
} from './lib.js'

export const parser = 'tsx'

const LEGACY_SIZE = /^icon-(xs|sm|md|lg)$/

export default function transform(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  const matches = jsxNameMatcher(j, root, ['IconButton', 'LinkIconButton'])
  let changed = false

  root
    .find(j.JSXOpeningElement)
    .filter(matches)
    .forEach((path) => {
      const size = attribute(path.node, 'size')
      const legacy = LEGACY_SIZE.exec(stringValue(size) ?? '')
      if (!legacy) return
      setStringValue(size, legacy[1])
      changed = true
    })

  return changed ? print(root, file.source) : file.source
}
