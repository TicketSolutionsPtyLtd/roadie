import { definePattern } from '@pandacss/dev'
import type { SystemStyleObject } from '@pandacss/types'

export const view = definePattern({
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
    minWidth: '0'
  },
  transform(props: SystemStyleObject) {
    return props
  },
  jsx: ['View']
})
