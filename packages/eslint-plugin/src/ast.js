export function staticString(node) {
  if (node?.type === 'JSXExpressionContainer')
    return staticString(node.expression)
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  }
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked
  }
  return undefined
}
