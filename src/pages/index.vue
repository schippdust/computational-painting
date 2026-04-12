<script setup lang="ts">
import { canvasRegistry } from '@/canvasRegistry';
</script>

<template>
  <v-container>
    <v-row class="mb-2">
      <v-col>
        <div class="text-h4">Computational Drawing</div>
        <div class="text-subtitle-1 text-medium-emphasis">
          Generative canvas experiments
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col
        v-for="canvas in canvasRegistry"
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
  </v-container>
</template>
