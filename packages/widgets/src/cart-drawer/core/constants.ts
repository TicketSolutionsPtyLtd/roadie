// Shared cart-drawer tuning constants. Single source so the React and Vue
// skins (and core) can't drift on the same magic number.

/** Pointer travel (px) below which a drag release counts as a tap → toggle. */
export const TAP_PX = 5

/**
 * Drag progress below which header/footer ResizeObserver measurements are
 * trusted — above it the drawer is morphing and the measured sizes would
 * inflate the docked (closed) height.
 */
export const MEASURE_PROGRESS_MAX = 0.05

/** Viewport margin (px) subtracted from the visible height for the open drawer. */
export const VIEWPORT_MARGIN_PX = 32

/**
 * Top inset (px) left clear when the mobile drawer is open fullscreen. The
 * drawer is bottom-anchored (bottom:0), so subtracting this from the layout
 * viewport height leaves this gap at the top — keeping the grab handle / header
 * clear of the status bar / top browser chrome.
 */
export const MOBILE_OPEN_TOP_INSET_PX = 30

/** How long (ms) the cart bounces after the ticket count increases. */
export const BOUNCE_HOLD_MS = 600

/**
 * Seconds remaining above which the urgency countdown switches to the coarse
 * "N mins" format instead of a live mm:ss tick.
 */
export const URGENCY_LONG_FORMAT_S = 300
