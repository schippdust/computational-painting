<script lang="ts" setup>
import computationalCanvas from '@/components/computationalCanvas.vue';
import initializationInputs from '@/components/initializationInputs.vue';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
const appStore = useAppStore();
const { initialized } = storeToRefs(appStore);
</script>

<template>
  <computationalCanvas v-if="initialized" />
  <initializationInputs v-else />
</template>
