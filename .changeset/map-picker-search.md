---
'@oztix/roadie-components': minor
---

Add `Map.Picker` and `Map.Search` to choose a place on a map. `Map.Picker` drops and drags a pin to choose a `Place`, flies the map to a `value` set from outside it, such as a form, and works as a form field, taking a `Field`'s states and submitting its position under `name`. Its `pin` swaps Roadie's pin for a graphic of the app's own, as a marker's does. `Map.Search` finds places from an app's own `suggest`, such as AddressFinder, on Roadie's `Autocomplete`, and flies the map to the one chosen. Both use the `Place` type, which `@oztix/roadie-components/map` exports.
