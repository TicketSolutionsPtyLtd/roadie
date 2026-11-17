'use client'

import { Fragment } from 'react'

import { CaretDownIcon } from '@phosphor-icons/react'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Menu } from '@oztix/roadie-components/menu'
import { Toolbar } from '@oztix/roadie-components/toolbar'

import { BlockMenuRadioGroup, type ControlState } from './EditorToolbarEngine'
import type { EditorBlockMenu } from './controls'
import { useEditorFinalFocus } from './focusEditor'

type EditorBlockMenuGroupProps = {
  label: string
  menus: readonly EditorBlockMenu[]
  states: readonly (ControlState | undefined)[]
  editor: TiptapEditor
}

/**
 * A node's choice menus as one button, each a group of its menu, for a
 * toolbar with no room for a button each, as on a phone.
 */
export function EditorBlockMenuGroup({
  label,
  menus,
  states,
  editor
}: EditorBlockMenuGroupProps) {
  const { triggerRef, popupRef, finalFocus } = useEditorFinalFocus(editor)
  return (
    <Menu>
      <Menu.Trigger
        ref={triggerRef}
        render={
          <Toolbar.Button disabled={!states.some((state) => state?.enabled)}>
            {label}
            <CaretDownIcon weight='bold' className='size-4' aria-hidden />
          </Toolbar.Button>
        }
      />
      <Menu.Content ref={popupRef} finalFocus={finalFocus}>
        {menus.map((menu, index) => (
          <Fragment key={menu.label}>
            {index > 0 ? <Menu.Separator /> : null}
            <BlockMenuRadioGroup
              menu={menu}
              state={states[index]}
              editor={editor}
              label={menu.label}
            />
          </Fragment>
        ))}
      </Menu.Content>
    </Menu>
  )
}
