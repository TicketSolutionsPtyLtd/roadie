export { Button, buttonVariants, type ButtonProps } from './components/Button'
export {
  IconButton,
  type IconButtonProps
} from './components/Button/IconButton'
export { LinkButton, type LinkButtonProps } from './components/LinkButton'
export {
  LinkIconButton,
  type LinkIconButtonProps
} from './components/LinkButton'
export { Code, codeVariants, type CodeProps } from './components/Code'
export { Highlight, type HighlightProps } from './components/Highlight'
export { Mark, markVariants, type MarkProps } from './components/Mark'
export { Prose, proseVariants, type ProseProps } from './components/Prose'
export {
  Accordion,
  accordionVariants,
  type AccordionProps
} from './components/Accordion'

export { Badge, badgeVariants, type BadgeProps } from './components/Badge'

export {
  Breadcrumb,
  type BreadcrumbProps,
  type BreadcrumbListProps,
  type BreadcrumbItemProps,
  type BreadcrumbLinkProps,
  type BreadcrumbSeparatorProps,
  type BreadcrumbCurrentProps
} from './components/Breadcrumb'

export {
  Card,
  cardVariants,
  type CardProps,
  type CardHeaderProps,
  type CardContentProps,
  type CardFooterProps,
  type CardImageProps,
  type CardTitleProps,
  type CardDescriptionProps
} from './components/Card'

export {
  Carousel,
  useCarousel,
  useCarouselUnsafeEmbla,
  carouselContentVariants,
  carouselContainerVariants,
  carouselItemVariants,
  carouselDotsVariants,
  type CarouselProps,
  type CarouselHeaderProps,
  type CarouselControlsProps,
  type CarouselContentProps,
  type CarouselContentOverflow,
  type CarouselItemProps,
  type CarouselTitleProps,
  type CarouselTitleLinkProps,
  type CarouselNavButtonProps,
  type CarouselDotsProps,
  type CarouselState,
  type CarouselActions,
  type UseCarouselReturn
} from './components/Carousel'

export {
  Separator,
  separatorVariants,
  type SeparatorProps
} from './components/Separator'

export { Marquee, type MarqueeProps } from './components/Marquee'

export {
  Steps,
  stepsVariants,
  useSteps,
  type StepsProps,
  type StepsListProps,
  type StepsItemProps,
  type StepsTriggerProps,
  type StepsTriggerTextProps,
  type StepsIndicatorProps,
  type StepsSeparatorProps,
  type StepsContentProps,
  type StepsCompletedContentProps,
  type StepsNextTriggerProps,
  type StepsPrevTriggerProps,
  type StepsProgressProps,
  type StepsContextProps,
  type StepsItemContextProps,
  type StepsRootProviderProps,
  type UseStepsProps,
  type UseStepsReturn
} from './components/Steps'

// Indicators
export {
  RequiredIndicator,
  type RequiredIndicatorProps,
  OptionalIndicator,
  type OptionalIndicatorProps
} from './components/Indicator'

// Form components
export { Label, type LabelProps } from './components/Label'
export { Input, inputVariants, type InputProps } from './components/Input'
export {
  Textarea,
  textareaVariants,
  type TextareaProps
} from './components/Textarea'
export {
  Field,
  useFieldContext,
  useFieldInputProps,
  type FieldProps,
  type FieldLabelProps,
  type FieldInputProps,
  type FieldTextareaProps,
  type FieldHelperTextProps,
  type FieldErrorTextProps
} from './components/Field'
export {
  Select,
  selectTriggerVariants,
  type SelectProps,
  type SelectTriggerProps,
  type SelectValueProps,
  type SelectIconProps,
  type SelectPortalProps,
  type SelectPositionerProps,
  type SelectPopupProps,
  type SelectItemProps,
  type SelectItemTextProps,
  type SelectItemIndicatorProps,
  type SelectGroupProps,
  type SelectGroupLabelProps,
  type SelectLabelProps,
  type SelectHelperTextProps,
  type SelectErrorTextProps,
  type SelectScrollUpArrowProps,
  type SelectScrollDownArrowProps,
  type SelectContentProps
} from './components/Select'
export {
  Combobox,
  comboboxInputGroupVariants,
  useFilter,
  type ComboboxProps,
  type ComboboxLabelProps,
  type ComboboxInputGroupProps,
  type ComboboxInputProps,
  type ComboboxTriggerProps,
  type ComboboxClearProps,
  type ComboboxPortalProps,
  type ComboboxPositionerProps,
  type ComboboxPopupProps,
  type ComboboxListProps,
  type ComboboxItemProps,
  type ComboboxCollectionProps,
  type ComboboxItemIndicatorProps,
  type ComboboxGroupProps,
  type ComboboxGroupLabelProps,
  type ComboboxEmptyProps,
  type ComboboxStatusProps,
  type Filter,
  type FilterOptions
} from './components/Combobox'
export {
  Autocomplete,
  autocompleteInputGroupVariants,
  useFilteredItems,
  type AutocompleteProps,
  type AutocompleteValueProps,
  type AutocompleteInputGroupProps,
  type AutocompleteInputProps,
  type AutocompleteTriggerProps,
  type AutocompleteClearProps,
  type AutocompletePortalProps,
  type AutocompletePositionerProps,
  type AutocompletePopupProps,
  type AutocompleteListProps,
  type AutocompleteItemProps,
  type AutocompleteCollectionProps,
  type AutocompleteGroupProps,
  type AutocompleteGroupLabelProps,
  type AutocompleteEmptyProps,
  type AutocompleteStatusProps
} from './components/Autocomplete'
export {
  RadioGroup,
  radioGroupVariants,
  radioGroupItemVariants,
  type RadioGroupProps,
  type RadioGroupItemProps,
  type RadioGroupLabelProps,
  type RadioGroupHelperTextProps,
  type RadioGroupErrorTextProps
} from './components/RadioGroup'

// Fieldset is the pilot for the Pattern A migration. The compound ships as
// a namespace re-export backed by per-file leaves (tsdown unbundle mode);
// this barrel line — and consumer code importing `{ Fieldset }` from
// either the barrel or the `/fieldset` subpath — works in Next.js server
// components because Next follows the static re-export chain to each
// leaf's `'use client'` module. See `docs/contributing/COMPOUND_PATTERNS.md`.
export {
  Fieldset,
  type FieldsetProps,
  type FieldsetLegendProps,
  type FieldsetHelperTextProps,
  type FieldsetErrorTextProps
} from './components/Fieldset'

// Providers
export {
  ThemeProvider,
  useTheme,
  DEFAULT_ACCENT_COLOR,
  InvalidColorError,
  isValidHexColor,
  getAccentStyleTag,
  getAccentStyleTagSync,
  getAccentStyleSync,
  getBootstrapScript,
  getThemeScript,
  type ThemeProviderProps
} from './providers/ThemeProvider'
