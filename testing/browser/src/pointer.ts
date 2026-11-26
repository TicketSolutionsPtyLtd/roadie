export type PointerStep =
  | { type: 'move'; x: number; y: number; steps?: number }
  | { type: 'down' }
  | { type: 'up' }
  | { type: 'wait'; ms: number }
