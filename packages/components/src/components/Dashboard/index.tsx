import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { DashboardSection } from './DashboardSection'

export type { DashboardSectionProps } from './DashboardSection'
export type DashboardProps = ComponentProps<'div'>

function DashboardRoot({ className, ...props }: DashboardProps) {
  return (
    <div
      data-slot='dashboard'
      className={cn('grid gap-8', className)}
      {...props}
    />
  )
}
DashboardRoot.displayName = 'Dashboard'

const Dashboard = DashboardRoot as typeof DashboardRoot & {
  Section: typeof DashboardSection
}
Dashboard.Section = DashboardSection

export { Dashboard }
