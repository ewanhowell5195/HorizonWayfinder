<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { previewFor } from "../lib/areaPreview.js"

const props = defineProps({ game: String, areas: Array, lit: Array, litTribes: Array, tribeAreas: Object })
const emit = defineEmits(["size"])
const host = ref(null)
const shared = previewFor(props.game, props.areas)
let stop = null

onMounted(() => {
  host.value.append(shared.canvas)
  stop = shared.listen(size => emit("size", size))
  shared.preview.setLit(props.lit, props.litTribes, true)
  if (props.tribeAreas) {
    shared.preview.setTribes(props.game, props.tribeAreas)
  }
})

onBeforeUnmount(() => {
  stop?.()
  shared.canvas.remove()
})

watch(() => [props.lit, props.litTribes], () => shared.preview.setLit(props.lit, props.litTribes))
watch(() => props.tribeAreas, tribeAreas => tribeAreas && shared.preview.setTribes(props.game, tribeAreas))
</script>

<template>
  <div ref="host" class="area-preview-host"></div>
</template>

<style scoped>
.area-preview-host {
  position: absolute;
  inset: 0;
}

.area-preview-host :deep(.area-preview) {
  position: absolute;
  inset: -32px;
  width: calc(100% + 64px);
  height: calc(100% + 64px);
}
</style>
