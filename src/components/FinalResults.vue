<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { seedLink } from "../lib/seed.js"
import { MODE_NAMES } from "../lib/rules.js"
import OnceImage from "./OnceImage.vue"

// frame counts and timing printed by tools/game/build_summary_art.py
const CREST_MS = 4500
const POINT_MS = 4500
const ROWS_START_MS = 1300
const ROW_GAP_MS = 700
const ROW_COUNT_MS = 550
const CAPS_PAUSE_MS = 300
const POINT_LAG_MS = 100
const CAPS_BUILD_MS = 2400
const SLAM_MS = 1250
const DOCK_MS = 900
const GROW_SCALE = 1.2
const DOCK_SCALE = 0.92
const EXTRAS_HEIGHT = 110
const MAX_GLOW = 0.5
const RAY_LAYERS = [{ spin: 70, reverse: false, flicker: 3.7 }, { spin: 110, reverse: true, flicker: 5.3 }, { spin: 50, reverse: false, flicker: 2.9 }]

function rayGradient() {
  const stops = []
  let angle = Math.random() * 20
  while (angle < 340) {
    const width = 3 + Math.random() * 9
    const alpha = (0.25 + Math.random() * 0.45).toFixed(2)
    stops.push(`transparent ${angle.toFixed(1)}deg`, `rgb(255 214 130 / ${alpha}) ${(angle + width / 2).toFixed(1)}deg`, `transparent ${(angle + width).toFixed(1)}deg`)
    angle += width + 8 + Math.random() * 26
  }
  return `conic-gradient(${stops.join(", ")})`
}

const props = defineProps({ results: Array, total: Number, max: Number, mode: String, seed: String, animate: Boolean })
const emit = defineEmits(["menu", "again", "view"])
const playing = props.animate
const shown = ref(playing ? 0 : props.total)
const rowScores = ref(props.results.map(result => playing ? 0 : result.score))
const visible = ref(playing ? 0 : props.results.length)
const counted = ROWS_START_MS + (props.results.length - 1) * ROW_GAP_MS + ROW_COUNT_MS
const capsAt = playing ? counted + CAPS_PAUSE_MS : 0
const grown = ref(false)
const docked = ref(!playing)
const revealed = ref(!playing)
const pulse = ref(0)
const bump = ref("pulse")
const glow = computed(() => props.max ? shown.value / props.max * MAX_GLOW : 0)
const rayLayers = RAY_LAYERS.map(({ spin, reverse, flicker }) => ({ background: rayGradient(), "--spin": `${spin}s`, "--direction": reverse ? "reverse" : "normal", "--flicker": `${flicker}s`, "--offset": `${-Math.random() * flicker}s` }))
const copied = ref(false)
const root = ref(null)
const link = computed(() => seedLink(props.seed, props.total))
const modeName = computed(() => props.mode !== "normal" ? MODE_NAMES[props.mode] : "")
let frame = 0
const timers = []

async function copy() {
  try {
    await navigator.clipboard.writeText(link.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1600)
  } catch (error) {
    console.warn(error)
  }
}

function later(callback, ms) {
  timers.push(setTimeout(callback, ms))
}

function countRow(n) {
  const begin = performance.now()
  const base = shown.value
  const score = props.results[n].score
  bump.value = score > 0 ? "pulse" : "shake"
  pulse.value++
  function tick(now) {
    const t = Math.min((now - begin) / ROW_COUNT_MS, 1)
    rowScores.value[n] = Math.round(score * (1 - (1 - t) ** 3))
    shown.value = base + rowScores.value[n]
    if (t < 1) {
      frame = requestAnimationFrame(tick)
    }
  }
  frame = requestAnimationFrame(tick)
}

function room() {
  const width = root.value.offsetWidth
  if (innerWidth >= 900) {
    return { left: Math.max(24, innerWidth * 0.04) + width * DOCK_SCALE + 24 }
  }
  return { inset: Math.min(root.value.offsetHeight + EXTRAS_HEIGHT, innerHeight * 0.55) + 24 }
}

onMounted(() => {
  if (!playing) {
    return
  }
  props.results.forEach((_, n) => later(() => {
    visible.value = n + 1
    countRow(n)
  }, ROWS_START_MS + n * ROW_GAP_MS))
  later(() => {
    shown.value = props.total
    grown.value = true
  }, capsAt)
  later(() => {
    grown.value = false
    docked.value = true
  }, capsAt + CAPS_BUILD_MS)
  later(() => revealed.value = true, capsAt + CAPS_BUILD_MS + DOCK_MS * 0.3)
})

onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
  cancelAnimationFrame(frame)
})

defineExpose({ room })
</script>

<template>
  <div ref="root" class="final" :class="{ animate: playing, grown, docked }" :style="{ '--grow-scale': GROW_SCALE, '--dock-scale': DOCK_SCALE, '--dock-ms': `${DOCK_MS}ms`, '--slam-ms': `${SLAM_MS}ms`, '--slam-delay': `${POINT_LAG_MS}ms` }">
    <OnceImage class="crest" src="/summary/crest.avif" still="/summary/crest-end.avif" :ms="CREST_MS" :delay="capsAt" :animate="playing" />
    <div class="body">
      <div class="total" :class="{ subtitled: grown || docked }" :style="{ '--glow': glow }">
        <div class="rays" aria-hidden="true">
          <i v-for="(layer, n) in rayLayers" :key="n" :style="layer"></i>
        </div>
        <div class="score">
          <strong :key="pulse" :class="pulse ? bump : null">{{ shown.toLocaleString() }}</strong>
        </div>
        <span class="out-of">out of {{ max.toLocaleString() }}<template v-if="modeName"> &middot; {{ modeName }}</template></span>
      </div>
      <ol class="rounds">
        <li v-for="(result, n) in results" :key="n" :class="{ shown: n < visible }">
          <button type="button" :title="`View the round ${n + 1} photosphere`" @click="emit('view', n)">
            <img :src="`/rounds/${n % 5 + 1}.webp`" alt="" draggable="false">
            <span class="distance">{{ result.distance }}</span>
            <strong>{{ rowScores[n].toLocaleString() }}</strong>
          </button>
        </li>
      </ol>
      <div class="extras collapse" :class="{ open: revealed }" :inert="!revealed">
        <div class="collapse-inner">
          <div class="share">
            <small class="label">Seed</small>
            <code :title="link">{{ seed }}</code>
            <button class="secondary" type="button" @click="copy">{{ copied ? "Copied" : "Copy link" }}</button>
          </div>
          <div class="actions button-row bright">
            <button class="secondary" type="button" @click="emit('menu')">Menu</button>
            <button type="button" @click="emit('again')">Play again</button>
          </div>
        </div>
      </div>
    </div>
    <OnceImage class="point" src="/summary/point.avif" still="/summary/point-end.avif" :ms="POINT_MS" :delay="capsAt + POINT_LAG_MS" :animate="playing" />
  </div>
</template>

<style scoped>
.final {
  --w: min(400px, calc(100vw - 32px), calc((100vh - 48px) * 0.42));
  position: fixed;
  z-index: 6;
  left: 50%;
  top: 50%;
  width: var(--w);
  translate: -50% -50%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  transition: left var(--dock-ms) cubic-bezier(0.65, 0, 0.35, 1), top var(--dock-ms) cubic-bezier(0.65, 0, 0.35, 1), translate var(--dock-ms) cubic-bezier(0.65, 0, 0.35, 1), scale var(--dock-ms) cubic-bezier(0.65, 0, 0.35, 1), opacity 0.45s ease;
}

.final.grown {
  scale: var(--grow-scale);
}

.final.docked {
  left: calc(max(24px, 4vw) - var(--w) * (1 - var(--dock-scale)) / 2);
  translate: 0 -50%;
  scale: var(--dock-scale);
}

.final.animate {
  animation: fade-in 0.5s ease backwards;
}

.final.animate.grown {
  animation: fade-in 0.5s ease backwards, slam var(--slam-ms) linear var(--slam-delay) backwards;
}

.crest, .point {
  position: relative;
  z-index: 1;
  display: block;
  width: 90%;
  aspect-ratio: 434 / 134;
  pointer-events: none;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6));
}

.point {
  aspect-ratio: 434 / 148;
}

.body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: stretch;
  width: 100%;
  --panel-pad: 18px;
  padding: calc(var(--w) * 0.02) var(--panel-pad) 22px;
  background: linear-gradient(rgba(10, 12, 16, 0.94), rgba(6, 8, 11, 0.94));
  box-shadow: 0 0 0 1px rgba(242, 207, 120, 0.14), 0 24px 60px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  overflow: clip;
}

.total {
  position: relative;
  isolation: isolate;
  display: grid;
  justify-items: center;
  gap: 4px;
  margin: calc(var(--w) * 0.05) 0 calc(var(--w) * 0.04);
  text-align: center;
}

.total strong {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: calc(var(--w) * 0.2);
  line-height: 1;
  color: #fff;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.8);
}

.total span {
  font-size: calc(var(--w) * 0.034);
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(232, 234, 237, 0.85);
}

.out-of {
  opacity: 0;
  transition: opacity 0.5s ease 0.15s;
}

.score {
  translate: 0 calc((var(--w) * 0.034 * 1.3 + 4px) / 2);
  transition: translate 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.total.subtitled .out-of {
  opacity: 1;
}

.total.subtitled .score {
  translate: none;
}

.score {
  display: grid;
  justify-items: center;
}

.score strong {
  color: color-mix(in srgb, #ffe7b0 calc(var(--glow) * 100%), #fff);
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.8), 0 0 calc(4px + 14px * var(--glow)) rgb(255 214 130 / calc(var(--glow) * 1.3)), 0 0 calc(10px + 50px * var(--glow)) rgb(242 165 65 / calc(var(--glow) * 1.1));
}

.total strong.pulse {
  animation: pulse 0.35s ease-out;
}

.total strong.shake {
  animation: shake 0.4s ease-in-out;
}

.rays {
  position: absolute;
  inset: calc(var(--w) * -0.07) calc(-1 * var(--panel-pad)) calc(var(--w) * -0.04);
  z-index: -1;
  overflow: hidden;
  mask: radial-gradient(ellipse 55% 75% at 50% 48%, #000 35%, transparent 100%);
  opacity: calc(var(--glow) * 1.8);
  pointer-events: none;
}

.rays i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--w) * 1.3);
  aspect-ratio: 1;
  translate: -50% -50%;
  filter: blur(5px);
  animation: spin var(--spin) linear infinite var(--direction), flicker var(--flicker) ease-in-out var(--offset) infinite;
}

.final.animate .total {
  animation: fade-in 0.5s ease 0.2s backwards;
}

.rounds {
  display: grid;
  gap: 4px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}

.rounds li {
  transition: opacity 0.4s ease, translate 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.rounds li:not(.shown) {
  opacity: 0;
  translate: -16px 0;
}

.rounds button {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 4px 14px 4px 6px;
  text-align: left;
  text-transform: none;
  letter-spacing: normal;
  color: var(--text);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.rounds button:hover {
  background: rgba(242, 165, 65, 0.1);
  border-color: rgba(242, 165, 65, 0.4);
  filter: none;
}

.rounds img {
  height: 34px;
}

.distance {
  font-size: 14px;
  color: var(--muted);
}

.rounds strong {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.extras {
  transition: grid-template-rows 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
}

.share {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0 12px;
  padding: 6px 6px 6px 10px;
  background: rgba(255, 255, 255, 0.04);
}

.share small {
  letter-spacing: 0.2em;
}

.share code {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: all;
}

.share button {
  flex: none;
  padding: 6px 12px;
  font-size: 12px;
}

.actions > * {
  --pad-y: 12px;
  padding-left: 8px;
  padding-right: 8px;
  font-size: 13px;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

@media (max-width: 899px) {
  .final {
    --w: min(400px, calc(100vw - 32px));
    max-height: calc(100vh - 24px);
    overflow-y: auto;
    scrollbar-width: none;
  }

  .final.docked {
    left: 50%;
    top: calc(100% - 12px);
    translate: -50% -100%;
    scale: var(--dock-scale);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes pulse {
  40% {
    scale: 1.14;
  }
}

@keyframes shake {
  20%, 60% {
    translate: -6px 0;
  }

  40%, 80% {
    translate: 6px 0;
  }
}

@keyframes slam {
  0% {
    scale: 1;
  }

  8% {
    scale: calc(1 + (var(--grow-scale) - 1) * 0.27);
  }

  20% {
    scale: calc(1 + (var(--grow-scale) - 1) * 0.75);
  }

  36% {
    scale: calc(1 + (var(--grow-scale) - 1) * 1.09);
  }

  56%, 72% {
    scale: calc(1 + (var(--grow-scale) - 1) * 1.14);
  }

  88% {
    scale: calc(1 + (var(--grow-scale) - 1) * 1.05);
  }

  100% {
    scale: var(--grow-scale);
  }
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

@keyframes flicker {
  0%, 100% {
    opacity: 1;
  }

  13% {
    opacity: 0.55;
  }

  27% {
    opacity: 0.9;
  }

  41% {
    opacity: 0.4;
  }

  58% {
    opacity: 1;
  }

  72% {
    opacity: 0.65;
  }

  86% {
    opacity: 0.85;
  }
}
</style>
