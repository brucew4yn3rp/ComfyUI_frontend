<template>
  <div class="h-full z-8888 flex flex-col justify-between bg-comfy-menu-bg">
    <div class="flex flex-col">
      <div
        v-for="tool in allTools"
        :key="tool"
        :class="[
          'maskEditor_toolPanelContainer hover:bg-secondary-background-hover',
          { 
            maskEditor_toolPanelContainerSelected: currentTool === tool,
            'opacity-50 cursor-not-allowed': stagingActive
          }
        ]"
        :style="{ pointerEvents: stagingActive ? 'none' : 'auto' }"
        @click="!stagingActive && onToolSelect(tool)"
      >
        <div
          class="flex items-center justify-center"
          v-html="iconsHtml[tool]"
        ></div>
        <div class="maskEditor_toolPanelIndicator"></div>
      </div>
    </div>

    <!-- Staging mode indicator -->
    <div
      v-if="stagingActive"
      class="flex flex-col items-center px-2 py-3 mb-2 bg-blue-500/10 border border-blue-500/30 rounded-md"
    >
      <span class="text-xs text-blue-400 font-semibold text-center">
        {{ t('maskEditor.stagingMode') }}
      </span>
      <span class="text-xs text-blue-300 text-center mt-1">
        {{ t('maskEditor.toolsDisabled') }}
      </span>
    </div>

    <div
      class="flex flex-col items-center cursor-pointer rounded-md mb-2 transition-colors duration-200 hover:bg-secondary-background-hover"
      :title="t('maskEditor.clickToResetZoom')"
      @click="onResetZoom"
    >
      <span class="text-sm text-text-secondary">{{ zoomText }}</span>
      <span class="text-xs text-text-secondary">{{ dimensionsText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { useToolManager } from '@/composables/maskeditor/useToolManager'
import { iconsHtml } from '@/extensions/core/maskeditor/constants'
import type { Tools } from '@/extensions/core/maskeditor/types'
import { allTools } from '@/extensions/core/maskeditor/types'
import { t } from '@/i18n'
import { useMaskEditorStore } from '@/stores/maskEditorStore'

const { toolManager, stagingActive } = defineProps<{
  toolManager: ReturnType<typeof useToolManager>
  stagingActive?: boolean
}>()

const store = useMaskEditorStore()

const onToolSelect = (tool: Tools) => {
  if (stagingActive) return
  toolManager.switchTool(tool)
}

const currentTool = computed(() => store.currentTool)

const zoomText = computed(() => `${Math.round(store.displayZoomRatio * 100)}%`)
const dimensionsText = computed(() => {
  const img = store.image
  return img ? `${img.width}x${img.height}` : ' '
})

const onResetZoom = () => {
  store.resetZoom()
}
</script>