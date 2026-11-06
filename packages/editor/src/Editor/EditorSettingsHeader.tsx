'use client'

import type { Ref } from 'react'

import { Button } from '@oztix/roadie-components/button'
import { Drawer } from '@oztix/roadie-components/drawer'
import { Popover } from '@oztix/roadie-components/popover'

type EditorSettingsHeaderProps = {
  title: string
  /** A phone's sheet rather than a popover. */
  sheet: boolean
  onDone: () => void
  titleRef?: Ref<HTMLHeadingElement>
}

/**
 * A live settings form's head, as a block's settings have: its title, that
 * each change applies as it's made, and Done.
 */
export function EditorSettingsHeader({
  title,
  sheet,
  onDone,
  titleRef
}: EditorSettingsHeaderProps) {
  const Header = sheet ? Drawer.Header : Popover.Header
  const Title = sheet ? Drawer.Title : Popover.Title
  const Description = sheet ? Drawer.Description : Popover.Description
  return (
    <Header className='flex items-start justify-between gap-2 text-start'>
      <div className='grid gap-0.5'>
        <Title ref={titleRef} tabIndex={-1} className='outline-none'>
          {title}
        </Title>
        <Description className='text-sm text-subtle'>
          Changes apply as you go. Undo puts them back.
        </Description>
      </div>
      <Button size='sm' emphasis='strong' intent='accent' onClick={onDone}>
        Done
      </Button>
    </Header>
  )
}
