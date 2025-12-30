<template>
  <div class="flex flex-col gap-3 pb-3">
    <h3
      class="text-center text-[15px] font-sans text-[var(--descrip-text)] mt-2.5"
    >
      {{ t('maskEditor.stagingImage') }}
    </h3>

    <div class="flex flex-col gap-2 px-2">
      <p class="text-xs text-[var(--descrip-text)] text-center mb-2">
        {{ t('maskEditor.stagingInstructions') }}
      </p>

      <!-- Accept Button -->
      <button :class="acceptButtonClass" @click="$emit('accept')">
        <span class="flex items-center justify-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.5 4L6 11.5L2.5 8"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ t('maskEditor.acceptImage') }}
        </span>
      </button>

      <!-- Cancel Button -->
      <button :class="cancelButtonClass" @click="$emit('cancel')">
        <span class="flex items-center justify-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ t('maskEditor.cancelImage') }}
        </span>
      </button>

      <div class="w-full h-0.5 bg-[var(--border-color)] my-2" />

      <!-- Opacity Slider -->
      <SliderControl
        :label="t('maskEditor.previewOpacity')"
        :min="0"
        :max="1"
        :step="0.01"
        :model-value="opacity"
        @update:model-value="$emit('update:opacity', $event)"
      />

      <div class="w-full h-0.5 bg-[var(--border-color)] my-2" />

      <!-- Keyboard Shortcuts -->
      <div class="text-xs text-[var(--descrip-text)]">
        <p class="font-semibold mb-2">
          {{ t('maskEditor.keyboardShortcuts') }}:
        </p>
        <div class="flex flex-col gap-1 pl-2">
          <div class="flex justify-between">
            <span>{{ t('maskEditor.accept') }}:</span>
            <kbd
              class="px-2 py-0.5 bg-secondary-background-hover rounded text-xs"
              >{{ t('keyboardShortcuts.enter') }}</kbd
            >
          </div>
          <div class="flex justify-between">
            <span>{{ t('maskEditor.cancel') }}:</span>
            <kbd
              class="px-2 py-0.5 bg-secondary-background-hover rounded text-xs"
              >{{ t('keyboardShortcuts.esc') }}</kbd
            >
          </div>
          <div class="flex justify-between">
            <span>{{ t('maskEditor.move') }}:</span>
            <span class="text-xs">{{ t('maskEditor.dragImage') }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t('maskEditor.resize') }}:</span>
            <span class="text-xs">{{ t('maskEditor.dragHandles') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@/i18n'

import SliderControl from './controls/SliderControl.vue'

defineProps<{
  opacity: number
}>()

defineEmits<{
  accept: []
  cancel: []
  'update:opacity': [value: number]
}>()

const acceptButtonClass = `
  h-10 w-full rounded-[10px] 
  border-2 border-green-500
  bg-green-500/10
  text-green-500
  font-sans font-semibold
  transition-all duration-200
  hover:bg-green-500/20 hover:border-green-600
  active:scale-95
`

const cancelButtonClass = `
  h-10 w-full rounded-[10px]
  border border-[var(--p-form-field-border-color)]
  bg-[var(--comfy-menu-bg)]
  text-[var(--input-text)]
  font-sans
  transition-all duration-200
  hover:bg-secondary-background-hover hover:border-red-400
  active:scale-95
`
</script>
