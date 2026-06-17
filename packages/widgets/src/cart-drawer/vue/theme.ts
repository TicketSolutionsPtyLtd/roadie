import { computed, onScopeDispose, toValue, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { getOklchChromaSync, getOklchHueSync } from '@oztix/roadie-core/colors'

/** Roadie's default accent — used when no valid `accentColor` is supplied. */
const DEFAULT_ACCENT = '#0191eb'

/** Hex shapes Roadie's ThemeProvider accepts (3 / 6 / 8 digit). */
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value)
}

export type UseRoadieThemeOptions = {
  /** id of the injected `<style>` tag. Default `'roadie-accent-theme'`. */
  id?: string
  /** Accent used when `accentColor` is null/invalid. Default Roadie blue. */
  defaultAccentColor?: string
}

/** Apply a Roadie accent theme in a Vue app by writing OKLCH hue/chroma to `:root`. */
export function useRoadieTheme(
  accentColor: MaybeRefOrGetter<string | null | undefined>,
  options: UseRoadieThemeOptions = {}
): void {
  const id = options.id ?? 'roadie-accent-theme'
  const fallback = isValidHexColor(options.defaultAccentColor)
    ? options.defaultAccentColor
    : DEFAULT_ACCENT

  const coords = computed(() => {
    const raw = toValue(accentColor)
    const hex = isValidHexColor(raw) ? raw : fallback
    return {
      hue: Math.round(getOklchHueSync(hex)),
      chroma: +getOklchChromaSync(hex).toFixed(4)
    }
  })

  // Tracks ONLY a tag this hook created, so dispose never removes a server-injected/other tag.
  let createdTag: HTMLStyleElement | null = null

  watchEffect(() => {
    if (typeof document === 'undefined') return
    const { hue, chroma } = coords.value
    const css = `:root{--accent-hue:${hue};--accent-chroma:${chroma}}`
    let tag = document.getElementById(id) as HTMLStyleElement | null
    if (tag && tag.textContent === css) return // dedupe identical writes
    if (!tag) {
      tag = document.createElement('style')
      tag.id = id
      document.head.appendChild(tag)
      createdTag = tag
    }
    tag.textContent = css
  })

  onScopeDispose(() => {
    createdTag?.parentNode?.removeChild(createdTag)
    createdTag = null
  })
}
