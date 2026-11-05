'use client'

import { CaretDownIcon } from '@phosphor-icons/react'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Menu } from '@oztix/roadie-components/menu'
import { Toolbar } from '@oztix/roadie-components/toolbar'

import type { ControlState } from './EditorToolbarEngine'
import type { EditorBlockMenu } from './controls'
import { focusEditor } from './focusEditor'

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
  return (
    <Menu>
      <Menu.Trigger
        render={
          <Toolbar.Button disabled={!states.some((state) => state?.enabled)}>
            {label}
            <CaretDownIcon weight='bold' className='size-4' aria-hidden />
          </Toolbar.Button>
        }
      />
      <Menu.Content
        finalFocus={() => {
          focusEditor(editor)
          return false
        }}
      >
        {menus.map((menu, index) => {
          const current = states[index]?.current ?? menu.types[0]?.label
          return (
            <Menu.RadioGroup
              key={menu.label}
              value={current}
              onValueChange={(chosen) => {
                const type = menu.types.find(
                  (option) => option.label === chosen
                )
                type?.run(editor)
              }}
            >
              <Menu.GroupLabel>{menu.label}</Menu.GroupLabel>
              {menu.types.map((type) => (
                <Menu.RadioItem
                  key={type.label}
                  value={type.label}
                  closeOnClick
                >
                  {type.label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          )
        })}
      </Menu.Content>
    </Menu>
  )
}
