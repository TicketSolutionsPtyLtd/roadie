import { getFamilyTokens } from '@/lib/tokens'

import { SizeList } from './SizeList'

/** The container widths, each with its container-* class and max width. */
export async function ContainerScale() {
  const containers = (await getFamilyTokens('shape'))
    .filter(({ group, kind }) => group === 'Containers' && kind === 'variable')
    .map(({ name, value }) => ({
      name: name.replace('--container-', 'container-'),
      rem: value!.light!
    }))

  return <SizeList slot='container-scale' sizes={containers} />
}
