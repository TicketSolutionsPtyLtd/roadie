const CARD = 'https://ticketsolutionsptyltd.github.io/roadie/components/card'
const ROADIE_CARD = /^@oztix\/roadie-components(\/card)?$/

function cardPart(name, cards) {
  if (name.type === 'JSXIdentifier') {
    return cards.has(name.name) ? 'Root' : undefined
  }
  if (
    name.type === 'JSXMemberExpression' &&
    name.object.type === 'JSXIdentifier' &&
    cards.has(name.object.name)
  ) {
    return name.property.name
  }
  return undefined
}

const isBlank = (child) =>
  (child.type === 'JSXText' && child.value.trim() === '') ||
  (child.type === 'JSXExpressionContainer' &&
    child.expression.type === 'JSXEmptyExpression')

// Only children the rule can see all of are judged: a component, an
// expression, or a fragment might render Card.Content, so the card passes.
function lacksContent(element, cards) {
  if (element.children.length === 0) {
    return !element.openingElement.attributes.some(
      (attribute) =>
        attribute.type === 'JSXSpreadAttribute' ||
        attribute.name.name === 'children'
    )
  }
  for (const child of element.children) {
    if (isBlank(child) || child.type === 'JSXText') continue
    if (child.type !== 'JSXElement') return false
    const part = cardPart(child.openingElement.name, cards)
    if (part === undefined || part === 'Content') return false
  }
  return true
}

export const cardRules = {
  'card-content': {
    meta: {
      type: 'problem',
      docs: { description: 'Every Card holds a Card.Content.' },
      schema: []
    },
    create(context) {
      const cards = new Set()
      return {
        ImportDeclaration(node) {
          if (!ROADIE_CARD.test(node.source.value)) return
          for (const specifier of node.specifiers) {
            if (
              specifier.type === 'ImportSpecifier' &&
              specifier.imported.name === 'Card'
            ) {
              cards.add(specifier.local.name)
            }
          }
        },
        JSXElement(node) {
          const part = cardPart(node.openingElement.name, cards)
          if (part !== 'Root' || !lacksContent(node, cards)) return
          context.report({
            node: node.openingElement,
            message: `Put the card's body in Card.Content. Card.Header has no bottom padding, so a card with only a title and description puts them in Card.Content. See ${CARD}#composition.`
          })
        }
      }
    }
  }
}
