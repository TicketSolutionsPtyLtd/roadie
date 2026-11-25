// Makes dev-only code removable from an app's production bundle. Bundlers
// replace `process.env.NODE_ENV` and then drop a branch that reads false, but
// only when the check is written in place: `isDev()` as a call, or a
// `displayName` set with no check, survives every bundler. So the build
// writes each one as the check Base UI and React ship, and the app's bundler
// substitutes it, as docs/solutions/build-errors/cross-bundler-dev-env-check.md
// requires.

const dev = (t) =>
  t.binaryExpression(
    '!==',
    t.memberExpression(
      t.memberExpression(t.identifier('process'), t.identifier('env')),
      t.identifier('NODE_ENV')
    ),
    t.stringLiteral('production')
  )

const isDevCheck = (t, node) =>
  t.isBinaryExpression(node, { operator: '!==' }) &&
  t.isStringLiteral(node.right, { value: 'production' }) &&
  t.isMemberExpression(node.left) &&
  t.isIdentifier(node.left.property, { name: 'NODE_ENV' })

const imported = (path, name) =>
  path.get('callee').isIdentifier({ name }) &&
  path.scope.getBinding(name)?.kind === 'module'

export function devOnly({ types: t }) {
  return {
    name: 'roadie-dev-only',
    visitor: {
      CallExpression(path) {
        const args = path.node.arguments
        if (imported(path, 'isDev') && args.length === 0) {
          path.replaceWith(dev(t))
        } else if (
          imported(path, 'useDevWarning') &&
          args.length === 1 &&
          !(t.isLogicalExpression(args[0]) && isDevCheck(t, args[0].left))
        ) {
          args[0] = t.logicalExpression('&&', dev(t), args[0])
        }
      },
      ExpressionStatement(path) {
        const { expression } = path.node
        if (
          path.parentPath.isProgram() &&
          t.isAssignmentExpression(expression, { operator: '=' }) &&
          t.isMemberExpression(expression.left, { computed: false }) &&
          t.isIdentifier(expression.left.property, { name: 'displayName' })
        ) {
          path.replaceWith(t.ifStatement(dev(t), path.node))
        }
      }
    }
  }
}

// Every source file that has something to guard, before the React Compiler.
export const devOnlyPreset = {
  preset: () => ({ plugins: [devOnly] }),
  rolldown: {
    filter: {
      id: /\/src\/.*\.tsx?$/,
      code: /\bisDev\(\)|\buseDevWarning\(|\.displayName = /
    }
  }
}
