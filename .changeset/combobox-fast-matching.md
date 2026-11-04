---
'@oztix/roadie-components': patch
---

`Combobox` and `Autocomplete` match and rank what someone types many times faster in English. Labels of plain letters, digits, and spaces now compare as folded strings, which give the same answers as the collator, and a label without the query anywhere is ruled out at once, so typing over 2,000 venues no longer spends a long task matching. Other labels and locales compare through the collator as before.
