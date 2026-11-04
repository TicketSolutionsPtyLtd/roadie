/**
 * Sweeps a mouse across the chart's plot, one move a frame, as someone
 * reading values along it would.
 */
export function sweepPointer(container: HTMLElement, frames: number) {
  const svg = container.querySelector<SVGSVGElement>('svg.ts-chart')!
  const box = svg.getBoundingClientRect()
  return (index: number) =>
    svg.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: box.left + 8 + ((box.width - 16) * index) / frames,
        clientY: box.top + box.height * (0.3 + 0.4 * ((index % 20) / 20))
      })
    )
}
