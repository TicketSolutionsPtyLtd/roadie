---
'@oztix/roadie-components': patch
---

Migrate every compound component to Pattern A (named exports + property assignment), matching the Carousel convention. Purely structural — consumer imports and the compound API (`<Select>`, `<Select.Trigger>`, `<Card.Header>`, etc.) are unchanged.

Affected compounds: Accordion, Autocomplete, Breadcrumb, Card, Combobox, Field, Fieldset, RadioGroup, Select, Steps.

Under the hood:

- Root functions renamed from `XRoot` → `X` where applicable (internal names only; these were never exported from the package barrel)
- Subcomponent `interface X extends Y` prop types converted to `type X = Y & { ... }` for `BreadcrumbSeparatorProps`, `FieldLabelProps`, `FieldHelperTextProps`, `FieldErrorTextProps`, `FieldsetLegendProps`, `FieldsetHelperTextProps`, `FieldsetErrorTextProps`, `RadioGroupLabelProps`, `RadioGroupHelperTextProps`, `RadioGroupErrorTextProps`, `SelectHelperTextProps`, `SelectErrorTextProps`, `SelectContentProps`
- Root prop types renamed to match convention where previously suffixed with `Root` (`SelectRootProps` → `SelectProps`, `ComboboxRootProps` → `ComboboxProps`, `AutocompleteRootProps` → `AutocompleteProps`, `FieldsetRootProps` → `FieldsetProps`, `FieldRootProps` → `FieldProps`, `RadioGroupRootProps` → `RadioGroupProps`). The old `*RootProps` names remain as `@deprecated` type aliases where they were re-exported from the package barrel (`SelectRootProps`, `ComboboxRootProps`, `AutocompleteRootProps`) for backwards compatibility
- `LinkButton` / `LinkIconButton`: inlined CVA variant props (`intent`, `emphasis`) as literal unions rather than `VariantProps<typeof buttonVariants>['key']`, which `react-docgen-typescript` couldn't drill into. New exported type aliases: `LinkButtonIntent`, `LinkButtonEmphasis`, `LinkButtonSize`, `LinkIconButtonSize` for consumers who want to annotate their own wrappers
