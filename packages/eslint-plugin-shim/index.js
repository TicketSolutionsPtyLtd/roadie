import plugin from '@oztix/roadie-lint-plugin'

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production')
  console.warn(
    '@oztix/roadie-eslint-plugin is now @oztix/roadie-lint-plugin. Swap the package in package.json and the import in your lint config.'
  )

export default plugin
