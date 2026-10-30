---
'@oztix/roadie-charts': minor
'@oztix/roadie-core': minor
---

Add period comparisons to dashboard charts. A line or bar card whose plot has a `comparison`, small multiples' panels too, now follows the dashboard's period, the way a delta with `comparison: true` does. It's drawn only while the period compares with Roadie's previous period, previous year or custom dates and the history isn't unavailable, and it's named by that comparison, such as "Previous period", or "Custom dates" when the dates are too long for a series label. `cardActions` gets each card as drawn, so a CSV from `cardTable(card)` matches its Table view. The portfolio example dashboard draws its daily sales this way, with the rows lined up by `alignComparison`. `validateDashboard` checks every field a small-multiples panel names, such as its `comparison`, `band`, or `line`, and warns on a line panel with both `comparison` and `series`, as it does for a line card. Like a comparison delta, a plot's `comparison` needs a period on the dashboard, and `validateDashboard` warns when an app's own comparison means it's never drawn.
