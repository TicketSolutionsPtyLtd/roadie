import charts from '@oztix/roadie-charts/roadie.manifest.json'
import components from '@oztix/roadie-components/roadie.manifest.json'
import widgets from '@oztix/roadie-widgets/roadie.manifest.json'

/** The subset of a `roadie.manifest.json` component the docs read. */
export type ManifestProp = {
  name: string
  type: string
  required?: boolean
  default?: string
  description?: string
  deprecated?: string
  /** The props type it's inherited from, such as a Base UI part's. */
  from?: string
}

export type ManifestPart = {
  name: string
  description?: string
  props: ManifestProp[]
}

export type ManifestComponent = ManifestPart & {
  import: string
  docs?: string
  parts?: ManifestPart[]
}

const byName = new Map<string, ManifestComponent>(
  [components, charts, widgets].flatMap(
    (manifest: { components: ManifestComponent[] }) =>
      manifest.components.map((component) => [component.name, component])
  )
)

export function manifestComponent(name: string): ManifestComponent {
  const component = byName.get(name)
  if (!component) {
    throw new Error(`No component named ${name} in any roadie.manifest.json`)
  }
  return component
}
