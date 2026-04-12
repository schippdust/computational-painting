# p5.js Patterns

## Instance Mode Only

p5 is always initialized in instance mode — never pollute the global namespace:

```ts
// In Vue component onMounted:
const sketch = (p5: P5) => {
  p5.setup = () => { ... };
  p5.draw = () => { ... };
  p5.keyPressed = () => { ... };
};
const canvasElement = document.getElementById('my-canvas') as HTMLElement;
new P5(sketch, canvasElement);
```

The `<div id="my-canvas">` in `<template>` is the mount target. p5 appends its `<canvas>` inside it.

## Sketch Structure

Setup initializes everything; draw is the per-frame loop. Declare mutable sketch-local variables outside both:

```ts
onMounted(() => {
  let collection: BranchingCollection;
  let renderer: DotRenderer;

  const sketch = (p5: P5) => {
    p5.setup = () => {
      p5.createCanvas(canvasWidth.value, canvasHeight.value);
      p5.background(0);
      collection = new BranchingCollection(
        [],
        createGenericBranchingCollectionProps(),
      );
      renderer = new DotRenderer(p5, 5, 15000, [255, 255, 255], camera.value);
    };
    p5.draw = () => {
      collection.update();
      renderer.renderVehicles(collection.vehicles);
    };
  };
});
```

## Canvas Size

Canvas dimensions come from Pinia: `canvasWidth.value` / `canvasHeight.value`. Default is 4600×4600. Do not hardcode canvas sizes.

## Coordinate System Convention

- **World space**: 3D, large scale (thousands of units). Vehicles live here.
- **Screen space**: 2D pixels (0→canvasWidth, 0→canvasHeight). Renderers work here.
- `Camera3D.project(worldPos)` returns screen `P5.Vector | null` (null = behind camera). Always null-check before drawing.
- The world +Z axis is "up" by default. Camera default is positioned at `(1000, 1000, 500)` looking at `(0,0,0)`.

## Persistent Canvas (No background() in draw)

The canvas intentionally **does not call `p5.background()`** in the draw loop. Marks accumulate. If you want to clear between experiments, call `p5.background(0)` once manually or at the start of `setup`.

Even if it seems like a script that is being requested should have a background clear, please do not add one without specifically requesting it from the user. In almost every case the background clear will not be desired.

## Drawing State Isolation

Always wrap per-vehicle drawing calls with `push()` / `pop()` to avoid leaking fill/stroke/strokeWeight state:

```ts
p5.push();
p5.fill(r, g, b);
p5.noStroke();
p5.ellipse(x, y, size, size);
p5.pop();
```

## Pause Support

```ts
p5.keyPressed = () => {
  pressSpaceToPause(p5); // from DrawingUtils — toggles p5.noLoop() / p5.loop()
};
```

## P5.Vector Usage

Use the static class, not the constructor shorthand, for type correctness:

```ts
import P5 from 'p5';

const v = new P5.Vector(1, 0, 0); // construction
const sum = P5.Vector.add(v1, v2); // static operations return new vector
const dist = P5.Vector.dist(v1, v2); // static distance
```

Mutating operations return `this` (method chaining):

```ts
v.normalize().mult(5).add(offset);
```

## Noise and Randomness

- `p5.noise(x, y, z)` — Perlin noise, returns [0, 1]
- `p5.random(min, max)` — uniform random
- `P5.Vector.random3D()` — random unit vector on sphere surface
- `p5.noiseDetail(octaves, falloff)` — configure before using noise
- WindSystem wraps curl noise (fBm) — prefer it over raw `p5.noise()` for organic movement
