import { definePattern } from '@pandacss/dev'
import type { SystemStyleObject } from '@pandacss/types'

export const container = definePattern({
  description:
    'A foundational layout component that provides a flexible container with sensible defaults',
  defaultValues: {
    display: 'flex',
    position: 'relative',
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    alignContent: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: '0',
    minWidth: '0',
    width: 'full',
    mx: 'auto',
    px: {
      base: '300',
      md: '400',
      lg: '600'
    },
    contain: true
  },
  properties: {
    contain: {
      // Whether to set a max width or not
      type: 'boolean',
      values: [true, false]
    }
  },
  transform(props: SystemStyleObject) {
    const { contain, ...rest } = props
    return {
      maxWidth: contain ? '8xl' : 'full',
      ...rest
    }
  },
  jsx: ['Container']
})
