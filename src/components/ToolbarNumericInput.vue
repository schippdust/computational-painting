<script setup lang="ts">
import { mergeProps } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    label: string;
    icon: string;
    tooltipText: string;
    min: number;
    max: number;
    step?: number;
  }>(),
  { step: undefined },
);

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const menuOpen = ref(false);
const internal = ref(props.modelValue);

watch(
  () => props.modelValue,
  (v) => {
    internal.value = v;
  },
);

const sliderStep = computed(() => {
  if (props.step !== undefined) return props.step;
  return parseFloat(((props.max - props.min) / 100).toPrecision(2));
});

function set(v: number) {
  const clamped = Math.min(props.max, Math.max(props.min, v));
  internal.value = clamped;
  emit('update:modelValue', clamped);
}

function onSlider(v: number) {
  set(v);
}

function onText(raw: string) {
  const n = parseFloat(raw);
  if (!isNaN(n)) set(n);
}
</script>

<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false" location="end">
    <template #activator="{ props: menuProps }">
      <v-tooltip :text="tooltipText" location="right">
        <template #activator="{ props: tip }">
          <v-btn
            variant="text"
            density="compact"
            v-bind="mergeProps(menuProps, tip)"
          >
            <v-icon size="18">{{ icon }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </template>
    <v-card min-width="240">
      <v-card-text class="px-4 pt-4 pb-3">
        <div class="text-caption text-medium-emphasis mb-2">{{ label }}</div>
        <v-slider
          :model-value="internal"
          :min="min"
          :max="max"
          :step="sliderStep"
          density="compact"
          thumb-label
          hide-details
          @update:model-value="onSlider"
        />
        <v-text-field
          :model-value="String(internal)"
          type="number"
          variant="outlined"
          density="compact"
          hide-details
          :min="min"
          :max="max"
          :step="sliderStep"
          class="mt-2"
          @update:model-value="onText"
        />
      </v-card-text>
    </v-card>
  </v-menu>
</template>
