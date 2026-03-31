import { Heading, Text } from '@oztix/roadie-components'

export const metadata = {
  title: 'Colors',
  description:
    'Our color system is built on OKLCH color scales with semantic intent tokens.',
}

export default function ColorsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Heading as="h1" size="3xl">Colors</Heading>
        <Text emphasis="subtle" size="lg">
          Our color system uses OKLCH color scales with 14 steps (0-13) per intent,
          supporting both light and dark modes.
        </Text>
      </div>

      <div className="flex flex-col gap-4">
        <Heading as="h2" size="xl">Intent colors</Heading>
        <div className="grid grid-cols-7 gap-2">
          {['neutral', 'brand', 'accent', 'danger', 'success', 'warning', 'info'].map((intent) => (
            <div key={intent} className={`intent-${intent} flex flex-col gap-1`}>
              <div className="emphasis-strong-surface h-12 rounded-md" />
              <Text size="xs" emphasis="subtle">{intent}</Text>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-lg emphasis-subtle-surface emphasis-default-border">
        <Text emphasis="subtle">
          Color tokens are defined in packages/core/src/css/tokens.css using OKLCH values.
          See the brainstorm document for the complete scale mapping.
        </Text>
      </div>
    </div>
  )
}
