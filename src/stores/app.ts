// Utilities

import { Camera3D } from '@/classes/Core/Camera3D';
import { defineStore } from 'pinia';
import { markRaw } from 'vue';
import P5 from 'p5';

const DARK_DEFAULTS = {
  primary: '#ffffff',
  secondary: '#808080',
  background: '#000000',
} as const;
const LIGHT_DEFAULTS = {
  primary: '#000000',
  secondary: '#808080',
  background: '#ffffff',
} as const;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface AppStoreParameters {
  initialized: boolean;
  canvasWidth: number;
  canvasHeight: number;
  threadWidth: number;
  threadSpacing: number;
  pauseCanvas: boolean;
  /**
   * Camera is wrapped with markRaw() so Vue's reactive proxy does not
   * deep-wrap the Camera3D instance. This matters because camera.project()
   * is called for every vehicle on every draw frame (~40k calls/sec at
   * 1000 vehicles × 40fps). Going through a Proxy for each call adds
   * meaningful overhead at that volume.
   */
  camera: Camera3D;
  axisVisibility: boolean;
  darkMode: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  /** Camera initial position applied when initializeCanvas() is called. */
  cameraInitPos: Vec3;
  /** Camera look-at target applied when initializeCanvas() is called. */
  cameraInitTarget: Vec3;
  /** Camera field-of-view in degrees applied when initializeCanvas() is called. */
  cameraInitFOV: number;
}

export const useAppStore = defineStore('app', {
  state: (): AppStoreParameters => ({
    initialized: false,
    canvasWidth: 4600,
    canvasHeight: 4600,
    threadWidth: 3,
    threadSpacing: 1,
    pauseCanvas: false,
    camera: markRaw(new Camera3D(600, 600)),
    axisVisibility: false,
    darkMode: true,
    primaryColor: DARK_DEFAULTS.primary,
    secondaryColor: DARK_DEFAULTS.secondary,
    backgroundColor: DARK_DEFAULTS.background,
    cameraInitPos: { x: 0, y: 0, z: 1000 },
    cameraInitTarget: { x: 0, y: 0, z: 0 },
    cameraInitFOV: 60,
  }),
  actions: {
    initializeCanvas() {
      this.initializeCamera();
      // Apply the camera settings chosen in the init overlay.
      const { x: px, y: py, z: pz } = this.cameraInitPos;
      const { x: tx, y: ty, z: tz } = this.cameraInitTarget;
      this.camera.setPosition(new P5.Vector(px, py, pz));
      this.camera.lookAt(new P5.Vector(tx, ty, tz));
      this.camera.setFOV(this.cameraInitFOV);
      this.initialized = true;
      return 'success!';
    },
    initializeCamera() {
      this.camera = markRaw(new Camera3D(this.canvasWidth, this.canvasHeight));
    },
    setCanvasDims(width: number, height: number) {
      this.canvasWidth = width;
      this.canvasHeight = height;
    },
    setThreadWidth(width: number) {
      this.threadWidth = width;
    },
    setThreadSpacing(spacing: number) {
      this.threadSpacing = spacing;
    },
    togglePause() {
      this.pauseCanvas = !this.pauseCanvas;
    },
    setCamera(camera: Camera3D) {
      this.camera = markRaw(camera);
    },
    setCameraPosition(pos: P5.Vector) {
      this.camera?.setPosition(pos);
    },
    setCameraTarget(target: P5.Vector) {
      this.camera?.lookAt(target);
    },
    setCameraFOV(fov: number) {
      this.camera?.setFOV(fov);
    },
    setCameraInitPos(x: number, y: number, z: number) {
      this.cameraInitPos = { x, y, z };
    },
    setCameraInitTarget(x: number, y: number, z: number) {
      this.cameraInitTarget = { x, y, z };
    },
    setCameraInitFOV(fov: number) {
      this.cameraInitFOV = fov;
    },
    resetInitialization() {
      this.initialized = false;
      this.pauseCanvas = false;
    },
    getProjectedPoint(vector: P5.Vector) {
      const projected = this.camera?.project(vector);
      return projected ?? null;
    },
    /**
     * Toggle dark/light mode.
     * @param dark True for dark mode, false for light mode.
     * @param applyColorDefaults If true, reset primaryColor/secondaryColor/backgroundColor
     *   to the defaults for the target mode. Pass false on canvas pages so user-chosen
     *   colors are preserved.
     */
    setDarkMode(dark: boolean, applyColorDefaults: boolean) {
      this.darkMode = dark;
      if (applyColorDefaults) {
        const d = dark ? DARK_DEFAULTS : LIGHT_DEFAULTS;
        this.primaryColor = d.primary;
        this.secondaryColor = d.secondary;
        this.backgroundColor = d.background;
      }
    },
    setPrimaryColor(color: string) {
      this.primaryColor = color;
    },
    setSecondaryColor(color: string) {
      this.secondaryColor = color;
    },
    setBackgroundColor(color: string) {
      this.backgroundColor = color;
    },
  },
});
