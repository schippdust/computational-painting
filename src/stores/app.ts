// Utilities
import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    initialized: false,
    canvasWidth: 600,
    canvasHeight: 600,
    threadWidth: 3,
    threadSpacing: 1,
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
  },
});
