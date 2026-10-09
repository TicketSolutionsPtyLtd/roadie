import { TokenFamilyPage } from '@/components/tokens/TokenFamilyPage'

export const metadata = {
  title: 'Shape and layout',
  tokenFamily: 'shape',
  description:
    "Tailwind's radius steps, Roadie's 5xl to 7xl additions, the container widths, the spacing unit, and the breakpoints.",
  category: 'Type, shape and depth',
  order: 2
}

export default function ShapeTokensPage() {
  return <TokenFamilyPage family='shape' />
}
