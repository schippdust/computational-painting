// Utilities

import { Camera3D } from '@/classes/Camera3D';
import { defineStore } from 'pinia';
import P5 from 'p5';

interface AppStoreParameters {
  initialized: boolean;
  canvasWidth: number;
  canvasHeight: number;
  threadWidth: number;
  threadSpacing: number;
  pauseCanvas: boolean;
  camera: Camera3D;
  axisVisibility: boolean;
}

let placeholderCamera = new Camera3D(600, 600);

export const useAppStore = defineStore('app', {
  state: (): AppStoreParameters => ({
    initialized: false,
    canvasWidth: 1200,
    canvasHeight: 1200,
    threadWidth: 3,
    threadSpacing: 1,
    pauseCanvas: false,
    camera: placeholderCamera,
    axisVisibility: false, //
  }),
  actions: {
    initializeCanvas() {
      this.initializeCamera();
      this.initialized = true;
      return 'success!';
    },
    initializeCamera() {
      let newCamera = new Camera3D(this.canvasWidth, this.canvasHeight);
      this.camera = newCamera;
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
      this.camera = camera;
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
    getProjectedPoint(vector: P5.Vector) {
      let projected = this.camera?.project(vector);
      if (projected == undefined) {
        return null;
      } else {
        return projected;
      }
    },
  },
});
