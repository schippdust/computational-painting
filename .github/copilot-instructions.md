# AI Coding Agent Instructions for Computational Drawing

## Project Overview

This project is a computational drawing application built with Vue 3, TypeScript, and Vuetify. It leverages modern front-end tooling like Vite, Pinia for state management, and unplugin-vue-components for automatic component imports. The application is structured to support generative art and computational geometry workflows.

### Key Components

- **Geometry Classes**: Found in `src/classes/Geometry/`, these classes (e.g., `Line`, `Circle`) define geometric primitives and provide helper methods for calculations like nearest points and coordinate systems.
- **Generators**: Located in `src/classes/Generators/`, these classes (e.g., `LineGenerator`, `CircleGenerator`) create and manage entities like vehicles along geometric paths.
- **Rendering**: Rendering utilities and canvas management are in `src/classes/Rendering/`.
- **Vue Components**: Found in `src/components/`, these are automatically imported and used for the UI.
- **State Management**: Pinia stores are in `src/stores/` for managing application state.

## Developer Workflows

### Building and Running

- **Install Dependencies**: Use `npm install` or `yarn install`.
- **Start Development Server**: Run `npm run dev` or `yarn dev` to start the Vite development server.
- **Build for Production**: Use `npm run build` or `yarn build`.

### Testing

- **Unit Tests**: (Add details here if applicable.)
- **Debugging**: Use browser developer tools and Vite's hot module replacement (HMR) for efficient debugging.

## Project-Specific Conventions

- **TypeScript Shorthand**: Constructor shorthand is used for defining class properties.
- **Coordinate Systems**: Geometric classes often use local-to-world transformations. See `CoordinateSystem` for helper methods.
- **Automatic Imports**: Components and routes are auto-imported using plugins like `unplugin-vue-components` and `unplugin-vue-router`.

## Integration Points

- **Vuetify**: Provides UI components and theming.
- **Pinia**: Manages application state.
- **Vite Plugins**: Handles layouts, routing, and component imports.

## Examples

### Using Geometry Classes

```typescript
const line = new Line(new P5.Vector(0, 0), new P5.Vector(100, 100));
const nearestPoint = line.getNearestPoint(new P5.Vector(50, 50));
```

### Creating a Generator

```typescript
const generator = new LineGenerator(p5, line, {
  startT: 0,
  endT: 1,
  tStep: 0.1,
  velocityAtGeneration: new P5.Vector(1, 0, 0),
});
generator.generateVehicles(new Vehicle());
```

## Additional Resources

- **Vuetify Documentation**: [vuetifyjs.com](https://vuetifyjs.com/)
- **Pinia Documentation**: [pinia.vuejs.org](https://pinia.vuejs.org/)
- **Vite Documentation**: [vitejs.dev](https://vitejs.dev/)
