import type { StaticPlotImage } from '@oztix/roadie-core/dashboard'

export const paceImage = (
  assetBase: string,
  name: string
): StaticPlotImage => ({
  src: `${assetBase}/charts/${name}-light.svg`,
  srcDark: `${assetBase}/charts/${name}-dark.svg`
})
