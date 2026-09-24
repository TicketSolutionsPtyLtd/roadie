---
'@oztix/roadie-components': minor
---

Align existing form controls and Popover with the newer components.

- `RadioGroup` and `Select` inherit `disabled` from `Field`. Their own
  `disabled` prop still wins.
- `RadioGroup.Item` uses `description` to describe the radio, not to name it.
  `label` and `description` accept any React node.
- `RadioGroup.Label` names the group when you use it.
- `Popover.Content` takes `side`, `align`, `sideOffset` and `alignOffset`
  directly, like `Tooltip.Content`. They win over the same keys in
  `positionerProps`, which are now deprecated.
- The `intent` prop on `Input`, `Textarea` and `Select.Trigger` is deprecated.
  Form controls take their colour from state, and `is-interactive-field`
  handles it. It still works and will be removed in v3.
