import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

import { Code } from '@oztix/roadie-components/code'

export const metadata = {
  title: 'Shape and layout',
  description:
    "Tailwind's radius steps, Roadie's 5xl to 7xl additions, the container widths, the spacing unit, and the breakpoints.",
  category: 'Type, shape and depth',
  order: 2
}

export default function ShapeTokensPage() {
  return (
    <TokenFamilyPage
      family='shape'
      intro={
        <>
          Roadie keeps Tailwind&apos;s radius scale and adds{' '}
          <Code>rounded-5xl</Code> to <Code>rounded-7xl</Code> for hero and
          feature surfaces. <Code>container-*</Code> centres a page at any
          container width. Spacing utilities multiply <Code>--spacing</Code>,
          and the breakpoints set where <Code>sm:</Code> to <Code>2xl:</Code>{' '}
          switch.
        </>
      }
    />
  )
}
