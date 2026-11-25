---
'@oztix/roadie-charts': minor
---

Update the charts stylesheet's rules to sit in the components layer, so a class that sets the same property on the same element now wins over them, as it does over Roadie's other classes. The rule that shows a chart's server drawing without scripts stays unlayered.
