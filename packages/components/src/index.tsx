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
  CalendarTile,
  calendarTileVariants,
  type CalendarTileProps
} from './components/CalendarTile'

export {
  Countdown,
  type CountdownDisplay,
  type CountdownProps,
  type CountdownSeconds,
  type CountdownUrgency,
  countdownUrgency,
  type UrgencyThresholds,
  useCountdownUrgency
} from './components/Countdown'

export { DateTime, type DateTimeProps } from './components/DateTime'

export { Duration, type DurationProps } from './components/Duration'

export {
  IconTile,
  iconTileVariants,
  type IconTileProps
} from './components/IconTile'

export { Image, type ImageProps, type ImageSource } from './components/Image'

export {
  Logo,
  type LogoProps,
  type LogoSize,
  type LogoVariant
} from './components/Logo'

export {
  EmptyState,
  emptyStateVariants,
  type EmptyStateProps,
  type EmptyStateSize,
  type EmptyStateIntent,
  type EmptyStateTitleProps,
  type EmptyStateDescriptionProps,
  type EmptyStateIconTileProps,
  type EmptyStateIllustrationProps,
  type EmptyStateActionsProps
} from './components/EmptyState'

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

export {
  ScrollArea,
  scrollAreaRootVariants,
  scrollAreaViewportVariants,
  scrollAreaContentVariants,
  scrollAreaScrollbarVariants,
  scrollAreaThumbVariants,
  scrollAreaCornerVariants,
  type ScrollAreaProps,
  type ScrollAreaViewportProps,
  type ScrollAreaContentProps,
  type ScrollAreaScrollbarProps,
  type ScrollAreaThumbProps,
  type ScrollAreaCornerProps,
  type ScrollAreaScrollbarOrientation,
  type ScrollAreaFade
} from './components/ScrollArea'

export {
  Navigator,
  type NavigatorProps,
  type NavigatorContentProps,
  type NavigatorPrimaryProps,
  type NavigatorSecondaryProps,
  type NavigatorItemProps,
  type NavigatorGroupProps,
  type NavigatorPlacement,
  type NavigatorVisibilityPriority,
  type NavigatorSlotMeta,
  type MobileSlots
} from './components/Navigator'

export {
  Pane,
  type PaneProps,
  type PaneHeaderProps,
  type PaneTitleProps,
  type PaneBodyTitleProps,
  type PaneActionsProps,
  type PaneSearchProps,
  type PaneFooterProps,
  type PaneRole,
  type PaneEmphasis,
  type PanePrimaryNav
} from './components/Pane'

export { Marquee, type MarqueeProps } from './components/Marquee'

export {
  List,
  type ListProps,
  type ListItemProps,
  type ListItemCurrent,
  type ListEmphasis
} from './components/List'

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

export {
  Tabs,
  tabsListVariants,
  tabsTabVariants,
  tabsIndicatorVariants,
  type TabsProps,
  type TabsListProps,
  type TabsTabProps,
  type TabsIndicatorProps,
  type TabsPanelProps,
  type TabsRootDirection,
  type TabsRootEmphasis,
  type TabsRootIntent,
  type TabsRootSize
} from './components/Tabs'

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

export {
  Popover,
  popoverPopupVariants,
  type PopoverProps,
  type PopoverTriggerProps,
  type PopoverPortalProps,
  type PopoverPositionerProps,
  type PopoverPopupProps,
  type PopoverArrowProps,
  type PopoverTitleProps,
  type PopoverDescriptionProps,
  type PopoverCloseProps,
  type PopoverHeaderProps,
  type PopoverBodyProps,
  type PopoverFooterProps,
  type PopoverContentProps
} from './components/Popover'

export {
  Tooltip,
  tooltipPopupVariants,
  type TooltipProps,
  type TooltipProviderProps,
  type TooltipTriggerProps,
  type TooltipPortalProps,
  type TooltipPositionerProps,
  type TooltipPopupProps,
  type TooltipArrowProps,
  type TooltipContentProps,
  type TooltipEmphasis,
  type TooltipSide
} from './components/Tooltip'

export {
  Dialog,
  dialogPopupVariants,
  type DialogProps,
  type DialogTriggerProps,
  type DialogPortalProps,
  type DialogBackdropProps,
  type DialogViewportProps,
  type DialogPopupProps,
  type DialogTitleProps,
  type DialogDescriptionProps,
  type DialogCloseProps,
  type DialogHeaderProps,
  type DialogBodyProps,
  type DialogFooterProps,
  type DialogContentProps
} from './components/Dialog'

export {
  Drawer,
  drawerPopupVariants,
  drawerViewportVariants,
  type DrawerProps,
  type DrawerTriggerProps,
  type DrawerPortalProps,
  type DrawerBackdropProps,
  type DrawerViewportProps,
  type DrawerPopupProps,
  type DrawerSwipeAreaProps,
  type DrawerHandleProps,
  type DrawerTitleProps,
  type DrawerDescriptionProps,
  type DrawerCloseProps,
  type DrawerHeaderProps,
  type DrawerBodyProps,
  type DrawerFooterProps,
  type DrawerContentProps,
  type DrawerSide,
  type DrawerSize
} from './components/Drawer'

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

export {
  RoadieLinkProvider,
  useRoadieLink,
  type RoadieLinkProviderProps,
  type RoadieLinkComponent,
  type RoadieLinkProps
} from './providers/RoadieLinkProvider'
