<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { MODE_NAMES } from "../lib/rules.js"
import HudCompass from "./HudCompass.vue"

const props = defineProps({ round: Number, count: Number, score: Number, heading: Number, hidden: Boolean, mode: String, compass: Boolean, swapped: Boolean, faded: Boolean })

const emblem = computed(() => `/rounds/${(props.round - 1) % 5 + 1}.webp`)
const stats = ref(null)
const placement = ref("centre")
// the .hud-compass width in HudCompass.vue
const COMPASS_WIDTH = 630 / 1080
const COMPASS_GAP = 16
// the .hud inset
const HUD_EDGE = 16
let observer = null

function measure() {
  const width = COMPASS_WIDTH * innerHeight
  const clear = stats.value.getBoundingClientRect().right + COMPASS_GAP
  placement.value = (innerWidth - width) / 2 >= clear ? "centre" : innerWidth - HUD_EDGE - width >= clear ? "right" : "below"
}

onMounted(() => {
  observer = new ResizeObserver(measure)
  observer.observe(stats.value)
  addEventListener("resize", measure)
  measure()
})

onBeforeUnmount(() => {
  observer.disconnect()
  removeEventListener("resize", measure)
})
</script>

<template>
  <div class="hud" :class="{ hidden }">
    <div ref="stats" class="panel stats">
      <img class="emblem" :src="emblem" alt="">
      <div class="stat"><span>Round</span><strong>{{ round }} / {{ count }}</strong></div>
      <div class="stat"><span>Score</span><strong>{{ score.toLocaleString() }}</strong></div>
      <div v-if="mode !== 'normal'" class="stat"><span>Mode</span><strong class="mode">{{ MODE_NAMES[mode] }}</strong></div>
    </div>
    <Teleport to="#sphere-box" defer :disabled="!swapped">
      <HudCompass v-if="compass" :heading="heading" :boxed="swapped" :faded="faded" :placement="placement" />
    </Teleport>
  </div>
</template>

<style scoped>
.hud {
  position: fixed;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  pointer-events: none;
}

.hud.hidden {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0s linear 0.3s;
}

.stats {
  display: flex;
  gap: 18px;
  padding: 8px 14px;
}

.stat span {
  display: block;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

.emblem {
  align-self: center;
  height: 40px;
  margin-right: -2px;
}

.stat .mode {
  color: var(--accent);
}

@media (hover: none), (max-width: 640px) {
  .stats {
    gap: 12px;
    padding: 6px 10px;
  }
}
</style>
