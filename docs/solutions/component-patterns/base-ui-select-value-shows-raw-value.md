---
title: Base UI Select.Value shows the raw value unless it is given labels
date: 2026-09-27
category: component-patterns
module: components/Select
tags: [base-ui, select, labels, ssr]
problem_type: bug
---

## Problem

Base UI's `Select.Value` prints the selected value as is unless the root gets
`items` or `itemToStringLabel`. The labels in the `Select.Item` children don't
count, so a trigger read "bee-gees" instead of "Bee Gees", and an object value
showed serialised.

## Fix

Roadie's `Select` collects the labels itself (#196):

- During render it reads string children and `Select.ItemText` from its
  `Select.Item` children, so a default value shows its label on the server and
  on first paint, before the popup mounts.
- Items rendered by other components register their label when they mount.
- It passes Base UI an `itemToStringLabel` that looks the value up by identity,
  so object values work too. The labels live in a ref, so an inline object
  value can't loop renders.

An explicit `items` or `itemToStringLabel` still wins.

Wrapping another Base UI part with a `.Value` (Combobox, Autocomplete)? Check
what it prints before assuming it reads the items' labels.
