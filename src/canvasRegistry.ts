export interface CanvasEntry {
  /** Kebab-case identifier — matches the route path and page filename. */
  id: string;
  /** Human-readable title shown on the gallery card. */
  title: string;
  /** Short description of what this iteration explores. */
  description: string;
  /** ISO date string (YYYY-MM-DD) of when the canvas was created. */
  createdAt: string;
}

export const canvasRegistry: CanvasEntry[] = [
  {
    id: 'computational-canvas',
    title: 'Computational Canvas',
    description:
      'Branching sphere formations with flocking behavior rendered as distance-scaled dots.',
    createdAt: '2025-01-01',
  },
];
