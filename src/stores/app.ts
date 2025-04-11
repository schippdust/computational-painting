// Utilities
import { defineStore } from 'pinia';

interface AppStoreParameters {
  initialized: boolean;
  canvasWidth: number;
  canvasHeight: number;
  threadWidth: number;
  threadSpacing: number;
  pauseCanvas: boolean;
}

export const useAppStore = defineStore('app', {
  state: (): AppStoreParameters => ({
    initialized: false,
    canvasWidth: 600,
    canvasHeight: 600,
    threadWidth: 3,
    threadSpacing: 1,
    pauseCanvas: false,
  }),
  actions: {
    initializeCanvas() {
      this.initialized = true;
      return 'success!';
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
  },
});
