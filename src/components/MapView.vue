<script setup>
import { onBeforeUnmount, ref } from "vue"
import { createMap } from "../lib/map.js"

const props = defineProps({ pickable: Boolean, pois: Boolean, scale: Boolean, modes: Boolean, faded: Boolean })
const emit = defineEmits(["pick"])
const host = ref(null)
let map = null
let loading = null

function load() {
  loading ??= createMap(host.value, { root: "/map/", onPick: props.pickable ? place => emit("pick", place) : null, pois: props.pois, scale: props.scale, modes: props.modes }).then(created => {
    map = created
    return map
  })
  return loading
}

onBeforeUnmount(() => loading?.then(created => created.destroy()))

defineExpose({
  load,
  place: (game, x, y) => map.place(game, x, y),
  locate: (x, y) => map.locate(x, y),
  addMarker: (element, x, y) => map.addMarker(element, x, y),
  pinReadout: (x, y) => map?.pinReadout(x, y),
  setLines: (pairs, classes) => map?.setLines(pairs, classes),
  setLineProgress: progress => map?.setLineProgress(progress),
  fit: (points, options) => map?.fit(points, options),
  refresh: () => map?.refresh(),
  whenReady: () => map?.whenReady(),
  setMode: (on, instant) => map?.setMode(on, instant),
  setFeatures: features => map?.setFeatures(features),
  setIconZoom: game => map?.setIconZoom(game),
  setBottomInset: pixels => map?.setBottomInset(pixels),
  setLocations: locations => map?.setLocations(locations),
  setReveal: (...args) => map?.setReveal(...args),
  setHeat: (points, sites) => map?.setHeat(points, sites)
})
</script>

<template>
  <div class="map-view" :class="{ faded }">
    <div ref="host" class="map-host"></div>
  </div>
</template>

<style scoped>
.map-view {
  position: absolute;
  inset: 0;
  transition: opacity 0.2s ease;
}

.map-view.faded {
  opacity: 0;
}
</style>
