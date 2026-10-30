---
'@oztix/roadie-components': patch
---

Fix `Combobox.Trigger` and `Combobox.Clear` centring on the whole input group once chips wrap onto several rows. Inside `Combobox.InputGroup` they now stay centred on the first row, as `QueryField`'s icon and Clear do.
