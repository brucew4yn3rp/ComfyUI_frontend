import { ref } from 'vue'
import { useMaskEditorStore } from '@/stores/maskEditorStore'

export interface StagingImage {
  img: HTMLImageElement
  x: number // Canvas coordinates
  y: number // Canvas coordinates
  width: number
  height: number
  rotation: number
  opacity: number
}

export interface StagingHandle {
  type: 'corner' | 'edge' | 'rotate' | 'move'
  position:
    | 'nw'
    | 'ne'
    | 'sw'
    | 'se'
    | 'n'
    | 's'
    | 'e'
    | 'w'
    | 'rotate'
    | 'center'
  x: number // Screen coordinates
  y: number // Screen coordinates
  size: number
}

export function useStagingManager() {
  const store = useMaskEditorStore()
  const stagingImage = ref<StagingImage | null>(null)
  const isDragging = ref(false)
  const isResizing = ref(false)
  const isRotating = ref(false)
  const activeHandle = ref<StagingHandle | null>(null)
  const dragStartPoint = ref({ x: 0, y: 0 })
  const initialTransform = ref<StagingImage | null>(null)

  const HANDLE_SIZE = 10
  const ROTATE_HANDLE_OFFSET = 30

  // Convert screen coordinates to canvas coordinates using existing pan/zoom logic
  const screenToCanvas = (screenX: number, screenY: number) => {
    const maskCanvas = store.maskCanvas
    if (!maskCanvas) return { x: 0, y: 0 }

    const rect = maskCanvas.getBoundingClientRect()
    const canvasX = (screenX - rect.left) / store.zoomRatio
    const canvasY = (screenY - rect.top) / store.zoomRatio

    return { x: canvasX, y: canvasY }
  }

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = (canvasX: number, canvasY: number) => {
    const maskCanvas = store.maskCanvas
    if (!maskCanvas) return { x: 0, y: 0 }

    const rect = maskCanvas.getBoundingClientRect()
    const screenX = canvasX * store.zoomRatio + rect.left
    const screenY = canvasY * store.zoomRatio + rect.top

    return { x: screenX, y: screenY }
  }

  // Load image from clipboard
  const handlePaste = async (event: ClipboardEvent) => {
    if (stagingImage.value) {
      // Already have a staging image, ignore
      return
    }

    const items = event.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile()
        if (!blob) continue

        try {
          const img = await loadImageFromBlob(blob)

          // Get viewport center in canvas coordinates
          const canvasContainer = store.canvasContainer
          if (!canvasContainer) return

          const containerRect = canvasContainer.getBoundingClientRect()
          const centerScreenX = containerRect.left + containerRect.width / 2
          const centerScreenY = containerRect.top + containerRect.height / 2
          const centerCanvas = screenToCanvas(centerScreenX, centerScreenY)

          stagingImage.value = {
            img,
            x: centerCanvas.x - img.width / 2,
            y: centerCanvas.y - img.height / 2,
            width: img.width,
            height: img.height,
            rotation: 0,
            opacity: 0.8
          }

          store.isStagingMode = true
          renderStaging()
        } catch (error) {
          console.error('Failed to load pasted image:', error)
        }
        break
      }
    }
  }

  const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      img.src = url
    })
  }

  // Calculate handles for the staging image
  const getHandles = (): StagingHandle[] => {
    if (!stagingImage.value) return []

    const { x, y, width, height } = stagingImage.value
    const topLeft = canvasToScreen(x, y)
    const topRight = canvasToScreen(x + width, y)
    const bottomLeft = canvasToScreen(x, y + height)
    const bottomRight = canvasToScreen(x + width, y + height)

    // Calculate midpoints
    const topMid = {
      x: (topLeft.x + topRight.x) / 2,
      y: (topLeft.y + topRight.y) / 2
    }
    const bottomMid = {
      x: (bottomLeft.x + bottomRight.x) / 2,
      y: (bottomLeft.y + bottomRight.y) / 2
    }
    const leftMid = {
      x: (topLeft.x + bottomLeft.x) / 2,
      y: (topLeft.y + bottomLeft.y) / 2
    }
    const rightMid = {
      x: (topRight.x + bottomRight.x) / 2,
      y: (topRight.y + bottomRight.y) / 2
    }

    // Rotate handle (above top middle)
    const rotateHandle = {
      x: topMid.x,
      y: topMid.y - ROTATE_HANDLE_OFFSET
    }

    return [
      // Corners
      {
        type: 'corner' as const,
        position: 'nw' as const,
        x: topLeft.x,
        y: topLeft.y,
        size: HANDLE_SIZE
      },
      {
        type: 'corner' as const,
        position: 'ne' as const,
        x: topRight.x,
        y: topRight.y,
        size: HANDLE_SIZE
      },
      {
        type: 'corner' as const,
        position: 'sw' as const,
        x: bottomLeft.x,
        y: bottomLeft.y,
        size: HANDLE_SIZE
      },
      {
        type: 'corner' as const,
        position: 'se' as const,
        x: bottomRight.x,
        y: bottomRight.y,
        size: HANDLE_SIZE
      },
      // Edges
      {
        type: 'edge' as const,
        position: 'n' as const,
        x: topMid.x,
        y: topMid.y,
        size: HANDLE_SIZE
      },
      {
        type: 'edge' as const,
        position: 's' as const,
        x: bottomMid.x,
        y: bottomMid.y,
        size: HANDLE_SIZE
      },
      {
        type: 'edge' as const,
        position: 'e' as const,
        x: rightMid.x,
        y: rightMid.y,
        size: HANDLE_SIZE
      },
      {
        type: 'edge' as const,
        position: 'w' as const,
        x: leftMid.x,
        y: leftMid.y,
        size: HANDLE_SIZE
      },
      // Rotate
      {
        type: 'rotate' as const,
        position: 'rotate' as const,
        x: rotateHandle.x,
        y: rotateHandle.y,
        size: HANDLE_SIZE
      }
    ]
  }

  // Check if point is over staging image or handles
  const hitTest = (
    screenX: number,
    screenY: number
  ): StagingHandle | 'move' | null => {
    if (!stagingImage.value) return null

    const handles = getHandles()

    // Check handles first
    for (const handle of handles) {
      const dx = screenX - handle.x
      const dy = screenY - handle.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= handle.size + 5) {
        return handle
      }
    }

    // Check if inside bounding box
    const canvasPoint = screenToCanvas(screenX, screenY)
    const { x, y, width, height } = stagingImage.value

    if (
      canvasPoint.x >= x &&
      canvasPoint.x <= x + width &&
      canvasPoint.y >= y &&
      canvasPoint.y <= y + height
    ) {
      return 'move'
    }

    return null
  }

  // Start interaction
  const startInteraction = (screenX: number, screenY: number) => {
    if (!stagingImage.value) return false

    const hit = hitTest(screenX, screenY)

    if (!hit) return false

    dragStartPoint.value = { x: screenX, y: screenY }
    initialTransform.value = { ...stagingImage.value }

    if (hit === 'move') {
      isDragging.value = true
      return true
    }

    if (typeof hit === 'object') {
      activeHandle.value = hit

      if (hit.type === 'rotate') {
        isRotating.value = true
      } else {
        isResizing.value = true
      }
      return true
    }

    return false
  }

  // Update interaction
  const updateInteraction = (screenX: number, screenY: number) => {
    if (!stagingImage.value || !initialTransform.value) return

    if (isDragging.value) {
      // Move
      const startCanvas = screenToCanvas(
        dragStartPoint.value.x,
        dragStartPoint.value.y
      )
      const currentCanvas = screenToCanvas(screenX, screenY)

      const dx = currentCanvas.x - startCanvas.x
      const dy = currentCanvas.y - startCanvas.y

      stagingImage.value.x = initialTransform.value.x + dx
      stagingImage.value.y = initialTransform.value.y + dy
    } else if (isResizing.value && activeHandle.value) {
      // Resize
      const currentCanvas = screenToCanvas(screenX, screenY)
      const handle = activeHandle.value

      const {
        x: initX,
        y: initY,
        width: initWidth,
        height: initHeight
      } = initialTransform.value

      let newX = initX
      let newY = initY
      let newWidth = initWidth
      let newHeight = initHeight

      // Calculate new dimensions based on handle position
      if (handle.position.includes('n')) {
        newY = currentCanvas.y
        newHeight = initY + initHeight - currentCanvas.y
      }
      if (handle.position.includes('s')) {
        newHeight = currentCanvas.y - initY
      }
      if (handle.position.includes('w')) {
        newX = currentCanvas.x
        newWidth = initX + initWidth - currentCanvas.x
      }
      if (handle.position.includes('e')) {
        newWidth = currentCanvas.x - initX
      }

      // Maintain minimum size
      if (newWidth < 10) newWidth = 10
      if (newHeight < 10) newHeight = 10

      // Maintain aspect ratio for corner handles
      if (handle.type === 'corner') {
        const aspectRatio = initWidth / initHeight

        if (Math.abs(newWidth / newHeight - aspectRatio) > 0.1) {
          if (
            Math.abs(newWidth - initWidth) > Math.abs(newHeight - initHeight)
          ) {
            newHeight = newWidth / aspectRatio
            if (handle.position.includes('n')) {
              newY = initY + initHeight - newHeight
            }
          } else {
            newWidth = newHeight * aspectRatio
            if (handle.position.includes('w')) {
              newX = initX + initWidth - newWidth
            }
          }
        }
      }

      stagingImage.value.x = newX
      stagingImage.value.y = newY
      stagingImage.value.width = newWidth
      stagingImage.value.height = newHeight
    } else if (isRotating.value) {
      // Rotation
      const center = {
        x: initialTransform.value.x + initialTransform.value.width / 2,
        y: initialTransform.value.y + initialTransform.value.height / 2
      }
      const centerScreen = canvasToScreen(center.x, center.y)

      const angle = Math.atan2(
        screenY - centerScreen.y,
        screenX - centerScreen.x
      )
      stagingImage.value.rotation = angle
    }

    renderStaging()
  }

  // End interaction
  const endInteraction = () => {
    isDragging.value = false
    isResizing.value = false
    isRotating.value = false
    activeHandle.value = null
    initialTransform.value = null
  }

  // Render staging overlay
  const renderStaging = () => {
    if (!stagingImage.value || !store.canvasContainer) return

    // Find or create staging canvas
    let stagingCanvas = document.getElementById(
      'stagingCanvas'
    ) as HTMLCanvasElement

    if (!stagingCanvas) {
      stagingCanvas = document.createElement('canvas')
      stagingCanvas.id = 'stagingCanvas'
      stagingCanvas.className =
        'absolute top-0 left-0 w-full h-full pointer-events-none'
      stagingCanvas.style.zIndex = '50'
      store.canvasContainer.appendChild(stagingCanvas)
    }

    const maskCanvas = store.maskCanvas
    if (!maskCanvas) return

    stagingCanvas.width = maskCanvas.width
    stagingCanvas.height = maskCanvas.height

    const ctx = stagingCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, stagingCanvas.width, stagingCanvas.height)

    const { img, x, y, width, height, rotation, opacity } = stagingImage.value

    // Draw image
    ctx.save()
    ctx.globalAlpha = opacity

    if (rotation !== 0) {
      ctx.translate(x + width / 2, y + height / 2)
      ctx.rotate(rotation)
      ctx.drawImage(img, -width / 2, -height / 2, width, height)
    } else {
      ctx.drawImage(img, x, y, width, height)
    }

    ctx.restore()

    // Draw bounding box and handles
    ctx.save()
    ctx.strokeStyle = '#007acc'
    ctx.lineWidth = 2 / store.zoomRatio
    ctx.setLineDash([5 / store.zoomRatio, 5 / store.zoomRatio])

    ctx.strokeRect(x, y, width, height)
    ctx.restore()

    // Draw handles
    const handles = getHandles()
    ctx.save()

    for (const handle of handles) {
      const canvasHandle = screenToCanvas(handle.x, handle.y)
      const handleSize = handle.size / store.zoomRatio

      ctx.fillStyle = handle.type === 'rotate' ? '#ff6b6b' : '#007acc'
      ctx.fillRect(
        canvasHandle.x - handleSize / 2,
        canvasHandle.y - handleSize / 2,
        handleSize,
        handleSize
      )

      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1 / store.zoomRatio
      ctx.strokeRect(
        canvasHandle.x - handleSize / 2,
        canvasHandle.y - handleSize / 2,
        handleSize,
        handleSize
      )
    }

    ctx.restore()
  }

  // Accept - merge into active layer
  const accept = () => {
    if (!stagingImage.value) return

    const canvas =
      store.activeLayer === 'mask' ? store.maskCanvas : store.rgbCanvas
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { img, x, y, width, height, rotation } = stagingImage.value

    ctx.save()

    if (rotation !== 0) {
      ctx.translate(x + width / 2, y + height / 2)
      ctx.rotate(rotation)
      ctx.drawImage(img, -width / 2, -height / 2, width, height)
    } else {
      ctx.drawImage(img, x, y, width, height)
    }

    ctx.restore()

    // Save to history
    store.canvasHistory.saveState()

    // Clean up
    cancel()
  }

  // Cancel - discard staging image
  const cancel = () => {
    stagingImage.value = null
    isDragging.value = false
    isResizing.value = false
    isRotating.value = false
    activeHandle.value = null
    store.isStagingMode = false

    // Remove staging canvas
    const stagingCanvas = document.getElementById('stagingCanvas')
    if (stagingCanvas) {
      stagingCanvas.remove()
    }
  }

  // Set opacity
  const setOpacity = (opacity: number) => {
    if (stagingImage.value) {
      stagingImage.value.opacity = opacity
      renderStaging()
    }
  }

  // Get cursor for current hover state
  const getCursor = (screenX: number, screenY: number): string => {
    if (!stagingImage.value) return 'default'

    const hit = hitTest(screenX, screenY)

    if (!hit) return 'default'

    if (hit === 'move') return 'move'

    if (typeof hit === 'object') {
      if (hit.type === 'rotate') return 'grab'

      // Resize cursors based on position
      const cursors: Record<string, string> = {
        nw: 'nwse-resize',
        ne: 'nesw-resize',
        sw: 'nesw-resize',
        se: 'nwse-resize',
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize'
      }

      return cursors[hit.position] || 'default'
    }

    return 'default'
  }

  return {
    stagingImage,
    isDragging,
    isResizing,
    isRotating,
    handlePaste,
    startInteraction,
    updateInteraction,
    endInteraction,
    accept,
    cancel,
    setOpacity,
    getCursor,
    renderStaging
  }
}
