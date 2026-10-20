---
'@oztix/roadie-components': patch
---

`Autocomplete` and `Combobox` options can be chosen with a tap on an iPhone.
Before, WebKit dropped the tap's click, so a tapped suggestion closed the list
without choosing. Touch and pen now choose an option when the finger lifts on
the option it went down on, and the list stays open while the finger is down,
even if the input blurs as the keyboard goes. A drag or a scroll chooses
nothing, and the mouse events that follow a tap don't choose again or land on
whatever the choice put under the finger.
