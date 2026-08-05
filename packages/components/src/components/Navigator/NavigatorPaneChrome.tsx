'use client'

import { use, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { ScrollArea } from '../ScrollArea'
import { NavigatorContext } from './NavigatorContext'
import { NavigatorIndicator } from './NavigatorIndicator'
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
import {
  navigatorSecondaryStripContentVariants,
  navigatorSecondaryStripVariants,
  navigatorSecondaryStripViewportVariants
} from './variants'

/** The active section's nav, rendered inside the top pane's header below `md`. */
export function NavigatorPaneChrome() {
  const { secondaryNav } = use(NavigatorContext)
  // Points at the strip's Viewport, not its `<nav>` root — the indicator
  // measures against the scrolling box.
  const stripRef = useRef<HTMLDivElement>(null)

  if (secondaryNav === null) return null

  return (
    <ScrollArea
      render={(renderProps) => <nav {...renderProps} role={undefined} />}
      data-slot='navigator-secondary-strip'
      aria-label={`${secondaryNav['aria-label']} tabs`}
      className={cn(secondaryNav.className, navigatorSecondaryStripVariants())}
    >
      <ScrollArea.Viewport
        ref={stripRef}
        data-slot='navigator-secondary-strip-viewport'
        className={navigatorSecondaryStripViewportVariants()}
      >
        <NavigatorIndicator trackRef={stripRef} surface='strip' />
        <ScrollArea.Content
          className={navigatorSecondaryStripContentVariants()}
        >
          <NavigatorPresentationContext value='strip'>
            {secondaryNav.children}
          </NavigatorPresentationContext>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='horizontal' flush>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )
}

NavigatorPaneChrome.displayName = 'NavigatorPaneChrome'
