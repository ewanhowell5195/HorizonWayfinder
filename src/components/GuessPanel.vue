<script setup>
import { computed } from "vue"
import { useMedia } from "../lib/media.js"
import SwapText from "./SwapText.vue"

const props = defineProps({ hidden: Boolean, held: Boolean, hasGuess: Boolean, swapped: Boolean })
const emit = defineEmits(["guess", "swap"])
const compact = useMedia("(hover: none), (max-width: 640px)")
const swapTitle = computed(() => props.swapped ? "Swap back: photosphere full screen" : "Swap: map full screen")
const guessLabel = computed(() => props.hasGuess ? "Guess" : "Place your guess")
function guess() {
  emit("guess")
}
</script>

<template>
  <div class="guess halo" :class="{ hidden, swapped, 'out-of-view': held }">
    <div class="map">
      <slot />
      <div id="sphere-box" class="sphere-box"></div>
      <button class="icon-button swap-toggle" type="button" :title="swapTitle" :aria-label="swapTitle" @click="emit('swap')"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter"><path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13" /></svg></button>
    </div>
    <div class="actions" :class="{ 'button-row': compact, bright: compact }">
      <button v-if="compact" class="secondary" type="button" @click="emit('swap')"><SwapText :text="swapped ? 'Photosphere' : 'Map'" /></button>
      <button class="submit" type="button" :disabled="!hasGuess" @click="guess"><SwapText :text="guessLabel" /></button>
    </div>
  </div>
</template>

<style scoped>
.guess {
  --edge: 16px;
  --gap: 8px;
  --actions: 52px;
  --tuck: calc(40px - 8px * sqrt(2));
  --shape: calc(320 / (220 + 40 - 8 * sqrt(2)));
  position: fixed;
  right: var(--edge);
  bottom: var(--edge);
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  width: 320px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.5s, opacity 0.3s ease 0s;
}

.guess.out-of-view {
  opacity: 0;
  pointer-events: none;
}

.guess::after {
  content: "";
  position: absolute;
  inset: calc(-1 * var(--edge));
  z-index: -1;
}

.guess:hover {
  width: min(100vh * 1280 / 1440, calc(100vw - var(--edge) * 2), calc((100vh - var(--edge) * 2 - var(--gap) - var(--actions) + var(--tuck)) * var(--shape)));
  transition-delay: 0s;
}

.guess.hidden {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0s linear 0.3s;
}

.map {
  position: relative;
  aspect-ratio: var(--shape);
  margin-bottom: calc(-1 * var(--tuck));
  background: #000;
  clip-path: polygon(0 0, 100% 0, 100% 100%, calc(100% - var(--tuck)) calc(100% - var(--tuck)), 0 calc(100% - var(--tuck)));
  opacity: 0.8;
  transition: opacity 0.4s ease 0.5s;
}

.map::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background:
    linear-gradient(var(--border), var(--border)) left top / 100% 1px no-repeat,
    linear-gradient(var(--border), var(--border)) left top / 1px calc(100% - var(--tuck)) no-repeat,
    linear-gradient(var(--border), var(--border)) right top / 1px 100% no-repeat,
    linear-gradient(var(--border), var(--border)) left 0 bottom var(--tuck) / calc(100% - var(--tuck)) 1px no-repeat,
    linear-gradient(to top right, transparent 50%, var(--border) 50%, var(--border) calc(50% + 1px), transparent calc(50% + 1px)) right bottom / var(--tuck) var(--tuck) no-repeat;
}

.guess:hover .map {
  opacity: 1;
  transition-delay: 0s;
}

.swap-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  color: var(--text);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease 0.5s;
}

.swap-toggle:hover:not(:disabled) {
  color: var(--accent);
  filter: none;
}

.guess:hover .swap-toggle {
  opacity: 1;
  pointer-events: auto;
  transition-delay: 0s;
}

.guess .map :deep(.map-scale) {
  left: 10px;
  bottom: calc(10px + var(--tuck));
}

.guess .map :deep(.map-elevation) {
  bottom: calc(10px + var(--tuck));
}

.map :deep(.map-mode) {
  top: 8px;
  right: 48px;
  bottom: auto;
  left: auto;
}

.map :deep(.map-scale), .map :deep(.map-elevation), .map :deep(.map-mode) {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease 0.5s;
}

.guess:hover .map :deep(.map-scale), .guess:hover .map :deep(.map-elevation), .guess:hover .map :deep(.map-mode) {
  opacity: 1;
  transition-delay: 0s;
}

.guess:hover .map :deep(.map-mode) {
  pointer-events: auto;
}

.map :deep(.map-poi img) {
  opacity: 0;
  transition: opacity 0.15s ease 0.5s;
}

.guess:hover .map :deep(.map-poi img) {
  opacity: 1;
  transition-delay: 0s;
}

.map :deep(.marker.removable img) {
  transform: scale(0.6667);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.5s;
}

.guess:hover .map :deep(.marker.removable img) {
  transform: none;
  transition-delay: 0s;
}

.actions {
  display: flex;
  gap: 8px;
  height: var(--actions);
}

.actions.button-row {
  display: grid;
  align-items: stretch;
}

.actions button {
  flex: 1;
}

.actions:not(.button-row) > .submit {
  padding: 15px 20px;
  font-size: 15px;
  letter-spacing: 0.22em;
  clip-path: polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
  transition: filter 0.2s ease, opacity 0.2s ease;
}

.sphere-box {
  display: none;
  position: absolute;
  inset: 0;
  z-index: 1;
  container-type: size;
}

.guess.swapped .sphere-box {
  display: block;
}

@media (hover: none), (max-width: 640px) {
  .guess, .guess:hover {
    left: 16px;
    width: auto;
  }

  .guess .map, .guess:hover .map {
    display: none;
  }
}
</style>
