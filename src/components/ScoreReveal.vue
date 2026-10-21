<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { loadCard } from "../lib/cauldrons.js"
import SwapText from "./SwapText.vue"

// the card art is 770 x 380; its visible rows run 6 to 297, the score band 110 to 223
const CARD_WIDTH = 770
const CARD_HEIGHT = 380
const VISIBLE_TOP = 6
const VISIBLE_BOTTOM = 297
const DOCK_BOTTOM = 112
const CARD_TOP = 20
const FIT_MARGIN = 40
// 61 frames at CARD_FRAME_MS in tools/game/build_cauldrons.py
const CARD_MS = 61 * 33
const HOLD_EARLY_MS = 60

const props = defineProps({ card: String, score: Number, distance: String, miss: Boolean, lastRound: Boolean, docked: Boolean, animate: Boolean, snapped: Boolean, viewing: Boolean })
const emit = defineEmits(["next", "view", "back"])
const src = ref(null)
const root = ref(null)
const label = computed(() => props.miss ? props.distance : `${props.distance} away`)
const still = computed(() => `/cauldrons/card-${props.card}-end.avif`)
let objectUrl = null
let holdTimer = 0

function cardHeight() {
  return Math.min(CARD_WIDTH, window.innerWidth * 0.92) * CARD_HEIGHT / CARD_WIDTH
}

function insets() {
  const scale = Number(getComputedStyle(root.value).getPropertyValue("--dock-scale"))
  return { inset: DOCK_BOTTOM + FIT_MARGIN, top: CARD_TOP + cardHeight() * scale * (VISIBLE_BOTTOM - VISIBLE_TOP) / CARD_HEIGHT + FIT_MARGIN }
}

function played() {
  if (src.value === objectUrl) {
    holdTimer = setTimeout(() => src.value = still.value, CARD_MS - HOLD_EARLY_MS)
  }
}

onMounted(async () => {
  if (!props.animate) {
    src.value = still.value
    return
  }
  new Image().src = still.value
  try {
    objectUrl = URL.createObjectURL(await loadCard(props.card))
    src.value = props.snapped ? still.value : objectUrl
  } catch (error) {
    console.warn(error)
    src.value = still.value
  }
})

watch(() => props.snapped, snapped => {
  if (snapped) {
    clearTimeout(holdTimer)
    src.value = still.value
  }
})

onBeforeUnmount(() => {
  clearTimeout(holdTimer)
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
  }
})

defineExpose({ insets })
</script>

<template>
  <div ref="root" class="reveal" :class="{ docked, animate, snapped, reviewing: viewing }" :style="{ '--top': `${CARD_TOP}px` }">
    <div class="stage">
      <img v-if="src" :src="src" alt="" @load="played">
      <div class="band">
        <strong>{{ score.toLocaleString() }}</strong>
        <span>{{ label }}</span>
      </div>
    </div>
    <div class="actions button-row bright halo">
      <button class="secondary" type="button" @click="emit(viewing ? 'back' : 'view')"><SwapText :text="viewing ? 'View map' : 'View photosphere'" /></button>
      <button type="button" @click="emit('next')"><SwapText :text="lastRound ? 'See results' : 'Next round'" /></button>
    </div>
  </div>
</template>

<style scoped>
.reveal {
  --w: min(770px, 92vw);
  --h: calc(var(--w) * 380 / 770);
  --dock-scale: 0.6;
  position: fixed;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

.stage {
  position: absolute;
  left: 50%;
  top: calc(var(--top) - var(--h) * 6 / 380);
  width: var(--w);
  height: var(--h);
  transform: translateX(-50%);
  transform-origin: 50% calc(var(--h) * 6 / 380);
  user-select: none;
  transition: transform 0.7s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.3s ease;
}

.reveal.reviewing .stage {
  opacity: 0;
}

.reveal.docked .stage {
  transform: translateX(-50%) scale(var(--dock-scale));
}

.stage::before {
  content: "";
  position: absolute;
  inset: 10% 5% 25%;
  z-index: -1;
  background: black;
  filter: blur(60px);
  opacity: 0.45;
}

.stage img {
  display: block;
  width: 100%;
  height: 100%;
}

.band {
  position: absolute;
  left: 0;
  right: 0;
  top: 28.95%;
  height: 29.74%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: calc(var(--h) * 0.012);
  text-align: center;
}

.band > * {
  pointer-events: auto;
  user-select: text;
}

.reveal.animate .band {
  animation: band-in 0.3s ease 0.85s backwards;
}

.reveal.snapped .band {
  animation: none;
}

.reveal.snapped .stage {
  transition: opacity 0.3s ease;
}

.reveal.snapped.docked .actions {
  transition: none;
}

.band strong {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: calc(var(--h) * 0.17);
  line-height: 1;
  color: #fff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
}

.band span {
  font-size: calc(var(--h) * 0.042);
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(232, 234, 237, 0.8);
}

.actions {
  position: absolute;
  left: 50%;
  bottom: 28px;
  width: min(560px, 92vw);
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, 12px);
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0s linear 0.3s;
}

.reveal.docked .actions {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
  pointer-events: auto;
  transition: opacity 0.4s ease 0.45s, transform 0.4s ease 0.45s;
}

.actions span {
  display: inline-block;
}

@media (max-width: 760px) {
  .reveal {
    --dock-scale: 0.85;
  }
}

@keyframes band-in {
  from {
    opacity: 0;
  }
}
</style>
