export interface CanvasEntry {
  /** Kebab-case identifier — matches the route path and page filename. */
  id: string;
  /** Human-readable title shown on the gallery card. */
  title: string;
  /** Short description of what this iteration explores. */
  description: string;
  /** ISO date string (YYYY-MM-DD) of when the canvas was created. */
  createdAt: string;
  /**
   * Display name of the canvas group this iteration belongs to.
   * Used to cluster iterations on the gallery landing page.
   * Multiple entries sharing the same group string will be shown together.
   */
  group: string;
}

/** Derived view used by the gallery: one entry per unique group. */
export interface CanvasGroup {
  name: string;
  canvases: CanvasEntry[];
}

/** Groups canvasRegistry entries by their group field, preserving insertion order. */
export function groupedCanvases(): CanvasGroup[] {
  const map = new Map<string, CanvasEntry[]>();
  for (const entry of canvasRegistry) {
    const existing = map.get(entry.group) ?? [];
    existing.push(entry);
    map.set(entry.group, existing);
  }
  return Array.from(map.entries()).map(([name, canvases]) => ({
    name,
    canvases,
  }));
}

export const canvasRegistry: CanvasEntry[] = [
  {
    id: 'branching-spheres',
    title: 'Branching Spheres',
    description:
      'Branching sphere formations with flocking behavior rendered as distance-scaled dots.',
    createdAt: '2025-01-01',
    group: 'Branching Spheres',
  },

  {
    id: 'sphere-emission',
    title: 'Sphere Emission',
    description:
      'A single sphere emitting vehicles from its surface — primary color for visible, secondary for occluded.',
    createdAt: '2026-04-12',
    group: 'Fundamentals',
  },

  {
    id: 'spring-grids',
    title: 'Spring Grids',
    description: 'A Simple Grid of Springs with attractors',
    createdAt: '2026-04-12',
    group: 'Springs',
  },
];
