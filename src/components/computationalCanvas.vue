<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
const appStore = useAppStore();
const { canvasHeight, canvasWidth } = storeToRefs(appStore);
</script>

<template>
  <div>Canvas</div>
</template>
