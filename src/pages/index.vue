<script setup lang="ts">
import { groupedCanvases } from '@/canvasRegistry';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const groups = groupedCanvases();

const appStore = useAppStore();
const { darkMode } = storeToRefs(appStore);

// Home page toggle: apply color defaults for the new mode.
function toggleDarkMode() {
  appStore.setDarkMode(!darkMode.value, true);
}
</script>

<template>
  <v-container>
    <v-row class="mb-4" align="center">
      <v-col>
        <div class="text-h4">Computational Drawing</div>
        <div class="text-subtitle-1 text-medium-emphasis">
          Generative canvas experiments
        </div>
      </v-col>
      <v-col cols="auto">
        <v-tooltip
          :text="darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
          location="bottom"
        >
          <template #activator="{ props: tip }">
            <v-btn
              variant="text"
              :icon="darkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'"
              v-bind="tip"
              @click="toggleDarkMode"
            />
          </template>
        </v-tooltip>
      </v-col>
    </v-row>

    <v-expansion-panels variant="accordion">
      <v-expansion-panel v-for="group in groups" :key="group.name">
        <v-expansion-panel-title>
          <span class="text-h6">{{ group.name }}</span>
          <span class="text-caption text-medium-emphasis ml-3">
            {{ group.canvases.length }} iteration{{
              group.canvases.length === 1 ? '' : 's'
            }}
          </span>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <v-row class="mt-1">
            <v-col
              v-for="canvas in group.canvases"
              :key="canvas.id"
              cols="12"
              sm="6"
              md="4"
            >
              <RouterLink
                :to="`/${canvas.id}`"
                style="text-decoration: none; color: inherit"
              >
                <v-card variant="outlined" style="cursor: pointer">
                  <v-card-title>{{ canvas.title }}</v-card-title>
                  <v-card-text>{{ canvas.description }}</v-card-text>
                  <v-card-subtitle class="pb-3">{{
                    canvas.createdAt
                  }}</v-card-subtitle>
                </v-card>
              </RouterLink>
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-container>
</template>
