<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { MODE_NAMES } from "../lib/rules.js"
import HudCompass from "./HudCompass.vue"

const props = defineProps({ round: Number, count: Number, score: Number, heading: Number, hidden: Boolean, mode: String, compass: Boolean, swapped: Boolean, faded: Boolean, time: { type: Number, default: null } })

const LOW_SECONDS = 10
const emblem = computed(() => `/rounds/${(props.round - 1) % 5 + 1}.webp`)
const clock = computed(() => `${Math.floor(props.time / 60)}:${String(props.time % 60).padStart(2, "0")}`)
const stats = ref(null)
const compassView = ref(null)
const placement = ref("centre")
const timerRoom = ref(true)
const timerTop = ref(null)
// the .hud-compass width in HudCompass.vue
const COMPASS_WIDTH = 630 / 1080
const COMPASS_GAP = 16
const TIMER_WIDTH = 80
// clears the .compass-shadow under the compass
const TIMER_GAP = 14
let observer = null

const timerSpot = computed(() => timerTop.value !== null ? "under" : timerRoom.value ? "header" : "below")

function measure() {
  const width = COMPASS_WIDTH * innerHeight
  const mark = document.querySelector(".menu-mark .mark")?.getBoundingClientRect().right ?? 0
  const clear = Math.max(mark, innerWidth - stats.value.getBoundingClientRect().left) + COMPASS_GAP
  placement.value = (innerWidth - width) / 2 >= clear ? "centre" : "below"
  timerRoom.value = (innerWidth - TIMER_WIDTH) / 2 >= clear
  nextTick(placeTimer)
}

function placeTimer() {
  const compass = props.compass && !props.swapped && compassView.value?.$el
  timerTop.value = compass ? compass.getBoundingClientRect().bottom + TIMER_GAP : null
}

watch(() => [props.compass, props.swapped], () => nextTick(placeTimer))

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
      <HudCompass v-if="compass" ref="compassView" :heading="heading" :boxed="swapped" :faded="faded" :placement="placement" />
    </Teleport>
    <div v-if="time !== null" class="round-timer caps" :class="[timerSpot, { low: time <= LOW_SECONDS }]" :style="timerTop !== null ? { top: `${timerTop}px` } : null" role="timer" aria-label="Time left"><span :key="time">{{ clock }}</span></div>
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

.round-timer {
  position: fixed;
  left: 50%;
  display: flex;
  justify-content: center;
  translate: -50% 0;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  --u: calc(100vh / 1080);
  filter: drop-shadow(0 0 calc(1.5 * var(--u)) rgba(0, 0, 0, 0.6)) drop-shadow(0 0 calc(1.5 * var(--u)) rgba(0, 0, 0, 0.6));
}

.round-timer.header {
  top: var(--header-top);
  align-items: center;
  /* the .mark-emblem height in styles.css */
  height: 17px;
}

.round-timer.below {
  /* the .hud-compass.below top in HudCompass.vue plus the .hud inset */
  top: 92px;
}

.round-timer span {
  transition: color 0.2s ease;
}

.round-timer.low span {
  font-size: 40px;
  color: var(--accent);
  animation: tick 0.4s ease-out;
}

@keyframes tick {
  from {
    transform: scale(1.15);
  }
}

@media (hover: none), (max-width: 640px) {
  .stats {
    gap: 12px;
  }

  .round-timer.below {
    top: 80px;
  }
}
</style>
