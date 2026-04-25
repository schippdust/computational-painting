import P5 from 'p5';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

/**
 * Wraps a three.js Mesh + BufferGeometry for use as a computation target in
 * this project. No rendering is performed by three.js — Mesh3D exists purely
 * so the raycaster, silhouette extractor, wire extractor, and occlusion
 * clipper can operate on a consistent, BVH-accelerated representation that
 * lives outside the scene graph.
 *
 * The Mesh is positioned/oriented through a local world matrix (translation +
 * quaternion) and kept up-to-date via updateMatrix/updateMatrixWorld.
 *
 * A generation counter ("revision") is bumped whenever vertex data mutates so
 * downstream extractors can invalidate their caches on mutation.
 */
export class Mesh3D {
  /** Underlying three.js Mesh. Exposed as an escape hatch for power users. */
  public readonly threeMesh: Mesh;

  /** BVH attached to the geometry for accelerated raycasts. Rebuilt on mutation. */
  private bvh: MeshBVH;

  /** Monotonic version tag; extractors invalidate caches when this changes. */
  private _revision: number = 0;

  /**
   * Creates a Mesh3D from a pre-built BufferGeometry.
   * The geometry's raycast is patched to the BVH-accelerated implementation.
   * @param geometry The BufferGeometry to wrap; non-indexed geometries are converted.
   */
  constructor(geometry: BufferGeometry) {
    const prepared = Mesh3D.ensureIndexedWithNormals(geometry);
    const material = new MeshBasicMaterial();
    this.threeMesh = new Mesh(prepared, material);
    this.threeMesh.raycast = acceleratedRaycast;
    this.bvh = new MeshBVH(prepared);
    prepared.boundsTree = this.bvh;
    this.threeMesh.updateMatrixWorld(true);
  }

  /** Underlying BufferGeometry. */
  get geometry(): BufferGeometry {
    return this.threeMesh.geometry as BufferGeometry;
  }

  /** Monotonic revision tag bumped on every vertex/geometry mutation. */
  get revision(): number {
    return this._revision;
  }

  /** World-space position of the mesh origin. */
  getPosition(): P5.Vector {
    const p = this.threeMesh.position;
    return new P5.Vector(p.x, p.y, p.z);
  }

  /**
   * Sets the world-space position of the mesh origin and refreshes the world
   * matrix. Bumps revision so extractors that bake the world matrix into
   * their caches (silhouette, wires) invalidate on the next query.
   * @param pos New world-space position.
   * @returns This Mesh3D for method chaining.
   */
  setPosition(pos: P5.Vector): Mesh3D {
    this.threeMesh.position.set(pos.x, pos.y, pos.z);
    this.threeMesh.updateMatrixWorld(true);
    this._revision++;
    return this;
  }

  /**
   * Rotates the mesh by the given quaternion components and refreshes the
   * world matrix. Bumps revision for the same reason as setPosition.
   * @param q Quaternion (x, y, z, w).
   * @returns This Mesh3D for method chaining.
   */
  setRotation(q: { x: number; y: number; z: number; w: number }): Mesh3D {
    this.threeMesh.quaternion.set(q.x, q.y, q.z, q.w);
    this.threeMesh.updateMatrixWorld(true);
    this._revision++;
    return this;
  }

  /** Current world matrix copied out as a new Matrix4. */
  getWorldMatrix(): Matrix4 {
    return this.threeMesh.matrixWorld.clone();
  }

  /**
   * Applies a per-vertex transform to the position attribute in local space.
   * Normals and the BVH are rebuilt afterwards. Bumps revision.
   * @param fn Receives each vertex (as a fresh P5.Vector) plus its index; return a new P5.Vector.
   * @returns This Mesh3D for method chaining.
   */
  mutateVertices(fn: (vertex: P5.Vector, index: number) => P5.Vector): Mesh3D {
    const pos = this.geometry.getAttribute('position') as BufferAttribute;
    const count = pos.count;
    for (let i = 0; i < count; i++) {
      const v = new P5.Vector(pos.getX(i), pos.getY(i), pos.getZ(i));
      const out = fn(v, i);
      pos.setXYZ(i, out.x, out.y, out.z);
    }
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    this.bvh = new MeshBVH(this.geometry);
    this.geometry.boundsTree = this.bvh;
    this._revision++;
    return this;
  }

  /**
   * Returns the vertex positions transformed into world space. Freshly
   * allocated each call; not cached.
   */
  getWorldVertices(): Vector3[] {
    const pos = this.geometry.getAttribute('position') as BufferAttribute;
    const mat = this.threeMesh.matrixWorld;
    const out: Vector3[] = new Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const v = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      v.applyMatrix4(mat);
      out[i] = v;
    }
    return out;
  }

  /**
   * Returns the geometry's index buffer as triangle triples. Throws if the
   * geometry is not indexed (the constructor guarantees indexing, so this
   * should never happen in practice).
   */
  getIndices(): Uint32Array | Uint16Array {
    const idx = this.geometry.getIndex();
    if (!idx) throw new Error('Mesh3D geometry must be indexed');
    return idx.array as Uint32Array | Uint16Array;
  }

  /**
   * Guarantees the geometry is indexed and has vertex normals available.
   * Non-indexed geometries are converted via a shared-vertex merge only when
   * positions match exactly; otherwise synthetic indices are emitted one per
   * vertex. Normals are recomputed unconditionally.
   */
  private static ensureIndexedWithNormals(
    geometry: BufferGeometry,
  ): BufferGeometry {
    const g = geometry;
    if (!g.getIndex()) {
      const pos = g.getAttribute('position');
      const indices: number[] = [];
      for (let i = 0; i < pos.count; i++) indices.push(i);
      g.setIndex(indices);
    }
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

/**
 * Namespace object for primitive builders. Kept as named exports so individual
 * builders tree-shake cleanly.
 */
export const MeshBuilders = {
  /**
   * Creates an axis-aligned box mesh centered on its local origin.
   * @param width Size along X.
   * @param height Size along Y.
   * @param depth Size along Z.
   */
  box(width: number, height: number, depth: number): Mesh3D {
    return new Mesh3D(new BoxGeometry(width, height, depth));
  },

  /**
   * Creates an icosphere (icosahedron subdivided `detail` times). Detail 0 is
   * a 20-face icosahedron; higher values produce smoother spheres.
   * @param radius Sphere radius.
   * @param detail Subdivision count (default 1).
   */
  icosphere(radius: number, detail: number = 1): Mesh3D {
    return new Mesh3D(new IcosahedronGeometry(radius, detail));
  },

  /**
   * Creates a flat rectangular plane on the XY plane, normal along +Z.
   * @param width Size along X.
   * @param height Size along Y.
   */
  plane(width: number, height: number): Mesh3D {
    return new Mesh3D(new PlaneGeometry(width, height));
  },

  /**
   * Builds a Mesh3D from explicit vertex positions and triangular faces.
   * @param vertices Ordered array of vertex positions.
   * @param faces Triangular face indices into `vertices`.
   */
  fromVerticesAndFaces(
    vertices: P5.Vector[],
    faces: [number, number, number][],
  ): Mesh3D {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
      positions[i * 3] = vertices[i].x;
      positions[i * 3 + 1] = vertices[i].y;
      positions[i * 3 + 2] = vertices[i].z;
    }
    const indices = new Uint32Array(faces.length * 3);
    for (let i = 0; i < faces.length; i++) {
      indices[i * 3] = faces[i][0];
      indices[i * 3 + 1] = faces[i][1];
      indices[i * 3 + 2] = faces[i][2];
    }
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setIndex(new BufferAttribute(indices, 1));
    return new Mesh3D(geometry);
  },
};
