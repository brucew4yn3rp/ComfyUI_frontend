<template>
  <div
    ref="pointerZoneRef"
    class="w-[calc(100%-4rem-220px)] h-full"
    :style="{ cursor: currentCursor }"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointerleave="handlePointerLeave"
    @pointerenter="handlePointerEnter"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @wheel="handleWheel"
    @contextmenu.prevent
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import type { usePanAndZoom } from '@/composables/maskeditor/usePanAndZoom'
import type { useStagingManager } from '@/composables/maskeditor/useStagingManager'
import type { useToolManager } from '@/composables/maskeditor/useToolManager'
import { useMaskEditorStore } from '@/stores/maskEditorStore'

const { toolManager, panZoom, stagingManager } = defineProps<{
  toolManager: ReturnType<typeof useToolManager>
  panZoom: ReturnType<typeof usePanAndZoom>
  stagingManager: ReturnType<typeof useStagingManager>
}>()

const store = useMaskEditorStore()
const pointerZoneRef = ref<HTMLDivElement>()
const hoverCursor = ref<string>('default')

onMounted(() => {
  if (!pointerZoneRef.value) {
    console.error('[PointerZone] Pointer zone ref not initialized')
    return
  }

  store.pointerZone = pointerZoneRef.value
})

// Compute cursor based on staging mode
const currentCursor = computed(() => {
  if (store.isStagingMode) {
    return hoverCursor.value
  }

  if (store.isPanning) {
    return 'grabbing'
  }

  return ''
})

watch(
  () => store.isPanning,
  (isPanning) => {
    if (!pointerZoneRef.value || store.isStagingMode) return

    if (!isPanning) {
      toolManager.updateCursor()
    }
  }
)

const handlePointerDown = async (event: PointerEvent) => {
  // Check if in staging mode first
  if (store.isStagingMode) {
    const started = stagingManager.startInteraction(
      event.clientX,
      event.clientY
    )
    if (started) {
      event.preventDefault()
      return
    }
  }

  await toolManager.handlePointerDown(event)
}

const handlePointerMove = async (event: PointerEvent) => {
  // Update cursor for staging mode
  if (store.isStagingMode) {
    hoverCursor.value = stagingManager.getCursor(event.clientX, event.clientY)

    // Update interaction if dragging/resizing
    if (
      stagingManager.isDragging.value ||
      stagingManager.isResizing.value ||
      stagingManager.isRotating.value
    ) {
      stagingManager.updateInteraction(event.clientX, event.clientY)
      event.preventDefault()
      return
    }
  }

  await toolManager.handlePointerMove(event)
}

const handlePointerUp = (event: PointerEvent) => {
  // End staging interaction
  if (
    store.isStagingMode &&
    (stagingManager.isDragging.value ||
      stagingManager.isResizing.value ||
      stagingManager.isRotating.value)
  ) {
    stagingManager.endInteraction()
    event.preventDefault()
    return
  }

  void toolManager.handlePointerUp(event)
}

const handlePointerLeave = () => {
  // End any staging interaction
  if (store.isStagingMode) {
    stagingManager.endInteraction()
    hoverCursor.value = 'default'
  }

  store.brushVisible = false
  if (pointerZoneRef.value && !store.isStagingMode) {
    pointerZoneRef.value.style.cursor = ''
  }
}

const handlePointerEnter = () => {
  if (!store.isStagingMode) {
    toolManager.updateCursor()
  }
}

const handleTouchStart = (event: TouchEvent) => {
  // Don't handle touch in staging mode for now
  if (store.isStagingMode) return

  panZoom.handleTouchStart(event)
}

const handleTouchMove = async (event: TouchEvent) => {
  // Don't handle touch in staging mode for now
  if (store.isStagingMode) return

  await panZoom.handleTouchMove(event)
}

const handleTouchEnd = (event: TouchEvent) => {
  // Don't handle touch in staging mode for now
  if (store.isStagingMode) return

  panZoom.handleTouchEnd(event)
}

const handleWheel = async (event: WheelEvent) => {
  await panZoom.zoom(event)
  const newCursorPoint = { x: event.clientX, y: event.clientY }
  panZoom.updateCursorPosition(newCursorPoint)

  // Re-render staging if zooming
  if (store.isStagingMode) {
    stagingManager.renderStaging()
  }
}
</script>
