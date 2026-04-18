import type P5 from 'p5';
import type { Line } from './Line';
import type { Sphere } from './Sphere';

/**
 * Union of all concrete geometry types that can occupy 3D world space.
 * Used wherever code must handle any geometry without knowing the specific kind —
 * spatial event logging, bounding-box computation, intersection dispatch, etc.
 *
 * Extend this union as new geometry classes are introduced to the Geometry folder.
 * Any code that switches on GeometryItem (instanceof guards, fromGeometry, etc.)
 * will surface a TypeScript error if the new type is not handled, making coverage
 * easy to audit.
 */
export type GeometryItem = P5.Vector | Line | Sphere;
