<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { createSphere } from "../lib/sphere.js"

const props = defineProps({ active: Boolean, boxed: Boolean, faded: Boolean })
const emit = defineEmits(["heading", "hold"])
const canvas = ref(null)
const HOLD_MS = 1000
const pressed = new Set()
let sphere = null
let holdTimer = null

function press(event) {
  pressed.add(event.pointerId)
  if (pressed.size === 1) {
    holdTimer = setTimeout(() => emit("hold", true), HOLD_MS)
  }
}

function release(event) {
  if (!pressed.delete(event.pointerId) || pressed.size) {
    return
  }
  clearTimeout(holdTimer)
  emit("hold", false)
}

function releaseAll() {
  pressed.clear()
  clearTimeout(holdTimer)
  emit("hold", false)
}

onMounted(() => {
  sphere = createSphere(canvas.value, { onHeading: heading => emit("heading", heading) })
  sphere.setActive(props.active)
  canvas.value.addEventListener("pointerdown", press)
  addEventListener("pointerup", release)
  addEventListener("pointercancel", release)
  addEventListener("blur", releaseAll)
})

watch(() => props.active, active => sphere?.setActive(active))

onBeforeUnmount(() => {
  sphere?.destroy()
  clearTimeout(holdTimer)
  removeEventListener("pointerup", release)
  removeEventListener("pointercancel", release)
  removeEventListener("blur", releaseAll)
})

defineExpose({
  decode: (url, onProgress) => sphere.decode(url, onProgress),
  upload: image => sphere.upload(image),
  present: (texture, yaw, pitch) => sphere.present(texture, yaw, pitch),
  discard: texture => sphere.discard(texture),
  setControls: controls => sphere.setControls(controls)
})
</script>

<template>
  <canvas ref="canvas" class="sphere" :class="{ boxed, faded }"></canvas>
</template>

<style scoped>
.sphere {
  position: fixed;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
  transition: opacity 0.2s ease;
}

.sphere.faded {
  opacity: 0;
}

.sphere.boxed {
  position: absolute;
}

.sphere.dragging {
  cursor: grabbing;
}

.sphere.locked {
  cursor: default;
}
</style>
