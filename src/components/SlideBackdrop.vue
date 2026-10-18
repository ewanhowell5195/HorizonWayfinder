<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { SLIDE_MS, createBackdrop } from "../lib/backdrop.js"

const props = defineProps({ active: Boolean, timer: Boolean, caption: { type: Boolean, default: true }, dock: Boolean })
const canvas = ref(null)
const game = ref("")
const label = ref("Screenshot")
const slide = ref(0)
const cycling = ref(false)
const timerStyle = { "--slide-ms": `${SLIDE_MS}ms` }
let mounted
let fogValue = null
const ready = new Promise(resolve => mounted = resolve).then(() => createBackdrop(canvas.value, {
  fogTop: () => document.querySelector(".screen.visible .screen-main, .round-intro.visible .eyebrow")?.getBoundingClientRect().top,
  fogRight: () => document.querySelector(".screen.visible .screen-main")?.getBoundingClientRect().right,
  onFog(middle) {
    const value = middle === null ? "" : `${Math.round(middle)}px`
    if (value !== fogValue) {
      fogValue = value
      document.documentElement.style.setProperty("--fog-middle", value)
    }
  },
  onSlide(entry) {
    game.value = entry.game
    label.value = entry.label || "Screenshot"
    slide.value++
  }
})).then(backdrop => {
  backdrop.setActive(props.active)
  return backdrop
})

onMounted(() => mounted())

onBeforeUnmount(() => ready.then(backdrop => backdrop.destroy()))

watch(() => props.active, active => ready.then(backdrop => backdrop.setActive(active)))

defineExpose({
  ready,
  next: instant => ready.then(backdrop => backdrop.next(instant)),
  prepare: () => ready.then(backdrop => backdrop.prepare()),
  useMaps: (game, title) => ready.then(backdrop => backdrop.useMaps(game, title)),
  useScreenshots: () => ready.then(backdrop => backdrop.useScreenshots()),
  cycle(on) {
    cycling.value = on
    return ready.then(backdrop => backdrop.cycle(on))
  },
  preload: count => ready.then(backdrop => backdrop.preload(count))
})
</script>

<template>
  <div class="backdrop" :class="{ shown: active }">
    <canvas ref="canvas"></canvas>
    <Teleport to="#home-credit" defer :disabled="!dock">
      <div class="credit" :class="{ hidden: !caption, docked: dock }">
        <small>{{ label }}</small>
        <span>{{ game }}</span>
        <div :key="slide" class="timer" :class="{ running: cycling, hidden: !timer }" :style="timerStyle"></div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  overflow: hidden;
  background: var(--bg);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.6s ease, visibility 0s linear 0.6s;
}

.backdrop.shown {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.6s ease;
}

canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.credit {
  position: absolute;
  right: 40px;
  bottom: 34px;
  display: grid;
  justify-items: end;
  gap: 6px;
  text-align: right;
  transition: opacity 0.4s ease;
}

/* the .screen padding in styles.css */
.credit.docked {
  bottom: calc(34px - clamp(20px, 3.6vh, 34px));
}

.credit.hidden {
  opacity: 0;
}

.credit small {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
}

.credit span {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.timer {
  position: relative;
  width: 140px;
  height: 2px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.18);
}

.timer.hidden {
  visibility: hidden;
}

.timer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
}

.timer.running::after {
  animation: timer var(--slide-ms) linear forwards;
}

@keyframes timer {
  to {
    transform: scaleX(1);
  }
}

@media (max-width: 760px) {
  .credit {
    display: none;
  }
}
</style>
