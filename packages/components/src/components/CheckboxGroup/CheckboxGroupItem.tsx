import { Checkbox, type CheckboxProps } from '../Checkbox/Checkbox'

export type CheckboxGroupItemProps = Omit<CheckboxProps, 'emphasis'>

export function CheckboxGroupItem(props: CheckboxGroupItemProps) {
  return <Checkbox {...props} />
}

CheckboxGroupItem.displayName = 'CheckboxGroup.Item'
