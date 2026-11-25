'use client'

import { use, useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { Button, type ButtonProps } from '../Button'
import { FileUploadInControl, useFileUploadContext } from './FileUploadContext'

export type FileUploadTriggerProps = Omit<
  ButtonProps,
  'href' | 'external' | 'target' | 'rel' | 'download'
>

/** The button that opens the file picker. It reads "Choose file", or "Replace" once there's one, and "Choose files" when the field takes more than one. */
export function FileUploadTrigger({
  id,
  ref,
  disabled,
  focusableWhenDisabled,
  onClick,
  children,
  emphasis,
  className,
  ...props
}: FileUploadTriggerProps) {
  const context = useFileUploadContext('FileUpload.Trigger')
  const inControl = use(FileUploadInControl) !== null
  const ownId = useId()
  const triggerId = id ?? ownId
  return (
    <Button
      data-slot='file-upload-trigger'
      ref={mergeRefs(ref, context.triggerRef)}
      id={triggerId}
      emphasis={emphasis ?? (inControl ? 'subtle' : undefined)}
      className={cn(
        inControl &&
          'h-full self-stretch rounded-l-none rounded-r-md border-0 border-l border-subtle',
        className
      )}
      disabled={context.disabled || disabled || context.full}
      // Full, it stays focusable, like the Dropzone.
      focusableWhenDisabled={
        focusableWhenDisabled ??
        (context.full && !context.disabled && !disabled)
      }
      aria-busy={context.checking.length > 0 || undefined}
      // The field's label and the chosen file come first, then what the button does.
      aria-labelledby={[context.labelId, context.valueId, triggerId]
        .filter(Boolean)
        .join(' ')}
      // Full, it says why, as the Dropzone's title does.
      aria-describedby={
        [context.describedBy, !disabled && context.fullId]
          .filter(Boolean)
          .join(' ') || undefined
      }
      aria-invalid={context.invalid || undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.open()
      }}
      {...props}
    >
      {children ??
        (context.maxFiles > 1
          ? 'Choose files'
          : context.files.length
            ? 'Replace'
            : 'Choose file')}
    </Button>
  )
}

FileUploadTrigger.displayName = 'FileUpload.Trigger'
