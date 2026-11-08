'use client'

import type { MapPalette } from './engine'

/**
 * How the basemap is coloured. `intent` draws it in the intent around the map;
 * `natural` draws green parks, blue water and yellow main roads, as people
 * know maps, whatever the intent.
 */
export type MapTone = 'intent' | 'natural'

// Each basemap colour comes from a step of a Roadie scale, so the map follows
// light and dark mode. In `intent`, every step is the intent's, and water and
// parks stay quiet so pins and areas carry the meaning.
const STEPS: Record<MapTone, Record<keyof MapPalette, string>> = {
  intent: {
    land: '--intent-2',
    park: '--intent-3',
    water: '--intent-5',
    building: '--intent-4',
    road: '--intent-0',
    roadMajor: '--intent-0',
    roadCasing: '--intent-6',
    rail: '--intent-7',
    border: '--intent-8',
    label: '--intent-text-subtle',
    labelHalo: '--intent-2'
  },
  natural: {
    land: '--color-neutral-1',
    park: '--color-success-4',
    water: '--color-brand-5',
    building: '--color-neutral-3',
    road: '--color-neutral-0',
    roadMajor: '--color-warning-4',
    roadCasing: '--color-neutral-5',
    rail: '--color-neutral-7',
    border: '--color-neutral-8',
    label: '--color-neutral-11',
    labelHalo: '--color-neutral-1'
  }
}

let canvas: CanvasRenderingContext2D | null | undefined

// Where a colour can't be read, such as outside a browser.
const FALLBACK = 'rgb(0, 0, 0)'

/**
 * A CSS colour as `rgb()`, which every engine reads. Roadie's colours resolve
 * to `oklch()`, so this paints a pixel and reads it back.
 */
export function toRgb(color: string): string {
  if (!color) return FALLBACK
  if (/^rgba?\(/.test(color)) return color
  canvas ??= document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true })
  if (!canvas) return FALLBACK
  canvas.clearRect(0, 0, 1, 1)
  canvas.fillStyle = color
  canvas.fillRect(0, 0, 1, 1)
  const [r, g, b] = canvas.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}

/** Reads a colour variable as `rgb()`, resolved where `element` sits. */
export function readColor(element: Element, variable: string): string {
  const probe = document.createElement('span')
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(${variable})`
  element.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return toRgb(color)
}

/** The basemap colours for a map frame, in its tone and the mode around it. */
export function readPalette(
  frame: Element,
  tone: MapTone = 'intent'
): MapPalette {
  return Object.fromEntries(
    Object.entries(STEPS[tone]).map(([name, variable]) => [
      name,
      readColor(frame, variable)
    ])
  ) as MapPalette
}
