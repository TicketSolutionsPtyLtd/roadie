import { Heading, Text, Code } from '@oztix/roadie-components'

export const metadata = {
  title: 'Token reference',
  description: 'Complete reference for all design tokens.',
}

function TokenTable({
  title,
  description,
  tokens,
}: {
  title: string
  description?: string
  tokens: { name: string; value: string; description?: string }[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <Heading level={2} size="lg">
        {title}
      </Heading>
      {description && (
        <Text emphasis="subtle">{description}</Text>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="py-2 pr-4 text-left font-medium">Token</th>
              <th className="py-2 pr-4 text-left font-medium">Value</th>
              {tokens.some((t) => t.description) && (
                <th className="py-2 text-left font-medium">Description</th>
              )}
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr
                key={token.name}
                className="border-b border-neutral-100 dark:border-neutral-900"
              >
                <td className="py-2 pr-4">
                  <Code>{token.name}</Code>
                </td>
                <td className="py-2 pr-4">
                  <code className="text-xs">{token.value}</code>
                </td>
                {token.description && (
                  <td className="py-2">
                    <Text size="sm" emphasis="subtle">
                      {token.description}
                    </Text>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TokenReferencePage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Heading as="h1" size="3xl">
          Token reference
        </Heading>
        <Text emphasis="subtle" size="lg">
          Complete reference for the v2 design token system. Tokens are defined
          as CSS custom properties via Tailwind v4&apos;s @theme directive.
        </Text>
      </div>

      <TokenTable
        title="Color scales"
        description="Each color scale provides 13 steps (0-12) for fine-grained control. Available scales: neutral, accent, brand, info, success, warning, danger."
        tokens={[
          { name: '--color-{scale}-0', value: 'Lightest', description: 'Backgrounds, surfaces' },
          { name: '--color-{scale}-1', value: 'Step 1', description: 'Subtle backgrounds' },
          { name: '--color-{scale}-2', value: 'Step 2', description: 'Hovered backgrounds' },
          { name: '--color-{scale}-3', value: 'Step 3', description: 'Active backgrounds' },
          { name: '--color-{scale}-4', value: 'Step 4', description: 'Subtle borders' },
          { name: '--color-{scale}-5', value: 'Step 5', description: 'Default borders' },
          { name: '--color-{scale}-6', value: 'Step 6', description: 'Strong borders' },
          { name: '--color-{scale}-7', value: 'Step 7', description: 'Muted foreground' },
          { name: '--color-{scale}-8', value: 'Step 8', description: 'Secondary elements' },
          { name: '--color-{scale}-9', value: 'Step 9', description: 'Primary solid backgrounds' },
          { name: '--color-{scale}-10', value: 'Step 10', description: 'Hovered solid backgrounds' },
          { name: '--color-{scale}-11', value: 'Step 11', description: 'Secondary text' },
          { name: '--color-{scale}-12', value: 'Darkest', description: 'High contrast text' },
        ]}
      />

      <TokenTable
        title="Intent tokens"
        description="Semantic intent tokens map to color scales and are used by components via the intent prop."
        tokens={[
          { name: 'neutral', value: 'Slate scale', description: 'Default, general-purpose UI' },
          { name: 'brand', value: 'Brand scale', description: 'Brand-specific elements' },
          { name: 'accent', value: 'Accent scale', description: 'Primary actions, highlighted elements' },
          { name: 'info', value: 'Blue scale', description: 'Informational messages and states' },
          { name: 'success', value: 'Green scale', description: 'Positive outcomes, confirmations' },
          { name: 'warning', value: 'Amber scale', description: 'Caution states, attention needed' },
          { name: 'danger', value: 'Red scale', description: 'Errors, destructive actions' },
        ]}
      />

      <TokenTable
        title="Emphasis levels"
        description="Emphasis controls the visual weight of text and interactive elements."
        tokens={[
          { name: 'strong', value: 'Step 12', description: 'High contrast, bold elements' },
          { name: 'default', value: 'Step 11', description: 'Standard foreground' },
          { name: 'subtle', value: 'Step 9-10', description: 'Secondary, supporting content' },
          { name: 'subtler', value: 'Step 7-8', description: 'Tertiary, muted content' },
          { name: 'inverted', value: 'Step 0-1', description: 'Light text on dark backgrounds' },
        ]}
      />

      <TokenTable
        title="Typography sizes"
        description="Text and Heading size tokens. All sizes are responsive."
        tokens={[
          { name: 'xs', value: '0.75rem', description: 'Captions, fine print' },
          { name: 'sm', value: '0.875rem', description: 'Secondary text, labels' },
          { name: 'base', value: '1rem', description: 'Body text (default)' },
          { name: 'lg', value: '1.125rem', description: 'Lead text, emphasis' },
          { name: 'xl', value: '1.25rem', description: 'Large text, subheadings' },
          { name: '2xl', value: '1.5rem', description: 'Heading (available on Heading)' },
          { name: '3xl', value: '1.875rem', description: 'Heading (available on Heading)' },
          { name: '4xl', value: '2.25rem', description: 'Display heading (available on Heading)' },
        ]}
      />

      <TokenTable
        title="Spacing"
        description="Spacing tokens used for padding, margin, and gap. Use Tailwind utility classes (p-2, gap-4, etc.) to apply these."
        tokens={[
          { name: '0', value: '0px', description: 'No spacing' },
          { name: '1', value: '0.25rem (4px)' },
          { name: '2', value: '0.5rem (8px)' },
          { name: '3', value: '0.75rem (12px)' },
          { name: '4', value: '1rem (16px)' },
          { name: '5', value: '1.25rem (20px)' },
          { name: '6', value: '1.5rem (24px)' },
          { name: '8', value: '2rem (32px)' },
          { name: '10', value: '2.5rem (40px)' },
          { name: '12', value: '3rem (48px)' },
          { name: '16', value: '4rem (64px)' },
        ]}
      />

      <div className="rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <Text emphasis="subtle">
          Token definitions are in{' '}
          <Code>packages/core/src/css/tokens.css</Code>. See the source file
          for the complete set of CSS custom properties available.
        </Text>
      </div>
    </div>
  )
}
