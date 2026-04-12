<script lang="ts" setup>
import { useTheme } from 'vuetify';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const theme = useTheme();
const appStore = useAppStore();
const { darkMode } = storeToRefs(appStore);

// Keep Vuetify's theme in sync with the store's darkMode.
// immediate: true ensures the correct theme is applied on first render.
watch(
  darkMode,
  (dark) => {
    theme.global.name.value = dark ? 'dark' : 'light';
  },
  { immediate: true },
);
</script>

<template>
  <v-app>
    <router-view />
  </v-app>
</template>
