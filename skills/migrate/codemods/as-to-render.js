import {
  attribute,
  jsxName,
  jsxNameMatcher,
  print,
  reporter,
  stringValue
} from './lib.js'

export const parser = 'tsx'

export const DEFAULT_TARGETS = [
  'Breadcrumb.Link',
  'Card',
  'Carousel.Title',
  'Carousel.TitleLink',
  'Highlight',
  'Mark',
  'Prose'
]

const TAG = /^[a-z][a-z0-9-]*$/

export default function transform(file, api, options = {}) {
  const j = api.jscodeshift
  const root = j(file.source)
  const report = reporter(api)
  const targets = options.targets
    ? String(options.targets).split(',')
    : DEFAULT_TARGETS
  const matches = jsxNameMatcher(j, root, targets)
  let changed = false

  root
    .find(j.JSXOpeningElement)
    .filter((path) => matches(path.node.name))
    .forEach((path) => {
      const opening = path.node
      const as = attribute(opening, 'as')
      if (!as) return
      const name = jsxName(opening.name)
      if (attribute(opening, 'render')) {
        report(opening, `<${name}> has both as and render; remove as by hand.`)
        return
      }
      const tag = stringValue(as)
      if (tag === undefined || !TAG.test(tag)) {
        // A component in render must get its own required props, such as a
        // router Link's href, so only a tag name is mechanical.
        report(
          opening,
          `<${name} as={…}> is not a tag name. With href, drop as and let RoadieProvider's Link route it; otherwise pass render={<Component …props />}.`
        )
        return
      }
      as.name = j.jsxIdentifier('render')
      as.value = j.jsxExpressionContainer(
        j.jsxElement(
          j.jsxOpeningElement(j.jsxIdentifier(tag), [], true),
          null,
          []
        )
      )
      changed = true
    })

  report.flush()
  return changed ? print(root, file.source) : file.source
}
