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

/**
 * Apply a Roadie accent theme in a Vue app — the same way React's
 * `<ThemeProvider accentColor>` does. Derives OKLCH hue + chroma from a hex
 * colour and writes them to `:root` as `--accent-hue` / `--accent-chroma`, from
 * which Roadie core regenerates every accent / intent / semantic token. The
 * cart drawer (whose `--rc-*` tokens bridge to those Roadie tokens) then tracks
 * the colour automatically, as does any other Roadie-tokened UI on the page.
 *
 * Reactive: pass a ref/getter and the theme follows it. Call once near the app
 * root, e.g. `useRoadieTheme(() => collection.value?.themeColour)`.
 *
 * SSR: the hue/chroma computation is pure (hydration-safe); the only DOM write
 * is guarded by `typeof document`. Modern browsers render the hue/chroma path
 * flash-free. For non-OKLCH browsers, server-inject the accent style before
 * hydration (parity with React's `getAccentStyleTagSync`); this hook does not
 * emit hex fallbacks.
 */
export function useRoadieTheme(
  accentColor: MaybeRefOrGetter<string | null | undefined>,
  options: UseRoadieThemeOptions = {}
): void {
  const id = options.id ?? 'roadie-accent-theme'
  const fallback = isValidHexColor(options.defaultAccentColor)
    ? options.defaultAccentColor
    : DEFAULT_ACCENT

  // Pure compute — no DOM. Resolve to a valid hex, then to OKLCH hue/chroma.
  const coords = computed(() => {
    const raw = toValue(accentColor)
    const hex = isValidHexColor(raw) ? raw : fallback
    return {
      hue: Math.round(getOklchHueSync(hex)),
      chroma: +getOklchChromaSync(hex).toFixed(4)
    }
  })

  // Tracks ONLY a tag this hook created, so dispose never removes a
  // server-injected tag or another instance's tag.
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
