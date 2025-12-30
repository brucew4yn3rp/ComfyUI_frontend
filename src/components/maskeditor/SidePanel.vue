<template>
  <div
    class="flex flex-col gap-3 pb-3 h-full !items-stretch bg-[var(--comfy-menu-bg)] overflow-y-auto w-55 px-2.5"
  >
    <div class="w-full min-h-full">
      <!-- Show staging settings when in staging mode -->
      <StagingSettingsPanel
        v-if="store.isStagingMode && stagingManager"
        :opacity="stagingManager.stagingImage.value?.opacity ?? 0.8"
        @accept="stagingManager.accept()"
        @cancel="stagingManager.cancel()"
        @update:opacity="stagingManager.setOpacity($event)"
      />

      <!-- Show normal settings when not in staging mode -->
      <template v-else>
        <SettingsPanelContainer />

        <div class="w-full h-0.5 bg-[var(--border-color)] mt-6 mb-1.5" />

        <ImageLayerSettingsPanel :tool-manager="toolManager" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { useStagingManager } from '@/composables/maskeditor/useStagingManager'
import type { useToolManager } from '@/composables/maskeditor/useToolManager'
import { useMaskEditorStore } from '@/stores/maskEditorStore'

import ImageLayerSettingsPanel from './ImageLayerSettingsPanel.vue'
import SettingsPanelContainer from './SettingsPanelContainer.vue'
import StagingSettingsPanel from './StagingSettingsPanel.vue'

const { toolManager, stagingManager } = defineProps<{
  toolManager?: ReturnType<typeof useToolManager>
  stagingManager?: ReturnType<typeof useStagingManager>
}>()

const store = useMaskEditorStore()
</script>
