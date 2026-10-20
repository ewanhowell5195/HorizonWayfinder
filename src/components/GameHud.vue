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
let observer = null

function measure() {
  const width = COMPASS_WIDTH * innerHeight
  const mark = document.querySelector(".menu-mark .mark")?.getBoundingClientRect().right ?? 0
  const clear = Math.max(mark, innerWidth - stats.value.getBoundingClientRect().left) + COMPASS_GAP
  placement.value = (innerWidth - width) / 2 >= clear ? "centre" : "below"
}

onMounted(() => {
  observer = new ResizeObserver(measure)
  observer.observe(stats.value)
  observer.observe(document.querySelector(".menu-mark .mark"))
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
    <div ref="stats" class="stats">
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
  pointer-events: none;
}

.hud::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(var(--header-top) * 2 + 60px);
  background: linear-gradient(rgba(7, 9, 12, 0.6), rgba(7, 9, 12, 0));
}

.hud.hidden {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0s linear 0.3s;
}

.stats {
  position: fixed;
  top: var(--header-top);
  right: var(--header-side);
  display: flex;
  align-items: center;
  gap: 18px;
  /* the .mark-emblem height in styles.css */
  height: 17px;
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
  }
}
</style>
