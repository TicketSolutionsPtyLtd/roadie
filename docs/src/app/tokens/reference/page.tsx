import { Heading, Text } from '@oztix/roadie-components'

export const metadata = {
  title: 'Token reference',
  description: 'Complete reference for all design tokens.',
}

export default function TokenReferencePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Heading as="h1" size="3xl">Token reference</Heading>
        <Text emphasis="subtle" size="lg">
          Complete reference for all design tokens. This page is being updated for v2.
        </Text>
      </div>
      <div className="p-6 rounded-lg emphasis-subtle-surface emphasis-default-border">
        <Text emphasis="subtle">
          The token system has been migrated from JSON-based tokens to CSS-first tokens
          defined via Tailwind v4&apos;s @theme directive. See the source file at
          packages/core/src/css/tokens.css for all available tokens.
        </Text>
      </div>
    </div>
  )
}
