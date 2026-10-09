import {
  attribute,
  jsxNameMatcher,
  print,
  removeAttribute,
  reporter
} from './lib.js'

export const parser = 'tsx'

const PLACEMENT = new Set(['side', 'align', 'sideOffset', 'alignOffset'])

function keyName(property) {
  if (property.computed) return undefined
  const { key } = property
  return key.type === 'Identifier' ? key.name : key.value
}

function isPlacement(property) {
  return (
    (property.type === 'ObjectProperty' || property.type === 'Property') &&
    PLACEMENT.has(keyName(property))
  )
}

function attributeValue(j, expression) {
  return expression.type === 'StringLiteral'
    ? j.stringLiteral(expression.value)
    : j.jsxExpressionContainer(expression)
}

export default function transform(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  const report = reporter(api)
  const matches = jsxNameMatcher(j, root, ['Popover.Content'])
  let changed = false

  root
    .find(j.JSXOpeningElement)
    .filter((path) => matches(path.node.name))
    .forEach((path) => {
      const opening = path.node
      const positionerProps = attribute(opening, 'positionerProps')
      const object = positionerProps?.value?.expression
      if (!object) return
      if (
        object.type !== 'ObjectExpression' ||
        object.properties.some((property) => property.type.includes('Spread'))
      ) {
        report(
          opening,
          '<Popover.Content positionerProps={…}> is not an object literal; move side, align, sideOffset, and alignOffset to Popover.Content by hand.'
        )
        return
      }
      const placement = object.properties.filter(isPlacement)
      if (placement.length === 0) return

      const at = opening.attributes.indexOf(positionerProps)
      const lifted = placement
        // A prop already on Popover.Content wins, so its positionerProps twin was dead.
        .filter((property) => !attribute(opening, keyName(property)))
        .map((property) =>
          j.jsxAttribute(
            j.jsxIdentifier(keyName(property)),
            attributeValue(j, property.value)
          )
        )
      opening.attributes.splice(at, 0, ...lifted)
      object.properties = object.properties.filter(
        (property) => !placement.includes(property)
      )
      if (object.properties.length === 0) {
        removeAttribute(opening, positionerProps)
      }
      changed = true
    })

  return changed ? print(root, file.source) : file.source
}
