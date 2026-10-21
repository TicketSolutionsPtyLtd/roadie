---
'@oztix/roadie-components': minor
---

Add `size` (`sm`, `md`, `lg`) to `Checkbox`, `CheckboxGroup`, and `RadioGroup`, and `trailing` to `Checkbox` and `RadioGroup.Item` for a count or value at the end of the row. The default `md` box is now 20px, down from 24px, which also makes RecordTable's and Records' selection checkboxes smaller; pass `size='lg'` to keep the old size. A ticked or indeterminate checkbox now fills with the accent's strong colour, with the icon in the text colour for strong, and drops the sunken inset of an empty box. Stacked items in a `CheckboxGroup` or `RadioGroup` sit 2px apart at `sm`, 4px at `md`, and 8px at `lg`, down from 8px at every size. A radio's dot is now half its circle at every size.
