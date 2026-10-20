<script setup>
import { computed } from "vue"
import { TIME_LIMITS, timeLabel } from "../lib/rules.js"

const props = defineProps({ seconds: Number })
const emit = defineEmits(["change"])

const index = computed(() => Math.max(TIME_LIMITS.indexOf(props.seconds || 0), 0))
const fill = computed(() => `${index.value / (TIME_LIMITS.length - 1) * 100}%`)
const label = computed(() => timeLabel(props.seconds))
</script>

<template>
  <div class="time">
    <input type="range" min="0" :max="TIME_LIMITS.length - 1" step="1" :value="index" :style="{ '--fill': fill }" :aria-valuetext="label" aria-label="Time per round" @input="event => emit('change', TIME_LIMITS[Number(event.target.value)])">
    <strong :class="{ off: !seconds }">{{ label }}</strong>
  </div>
</template>

<style scoped>
.time {
  display: flex;
  align-items: center;
  gap: 18px;
  max-width: 470px;
}

input {
  flex: 1;
  min-width: 0;
  height: 28px;
  margin: 0;
  background: none;
  cursor: pointer;
  appearance: none;
  user-select: none;
}

input::-webkit-slider-runnable-track {
  height: 4px;
  background: linear-gradient(var(--accent), var(--accent)) 0 0 / var(--fill) 100% no-repeat, rgba(255, 255, 255, 0.14);
}

input::-moz-range-track {
  height: 4px;
  background: linear-gradient(var(--accent), var(--accent)) 0 0 / var(--fill) 100% no-repeat, rgba(255, 255, 255, 0.14);
}

input::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  margin-top: -7px;
  background: var(--accent);
  border: 0;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
  appearance: none;
}

input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--accent);
  border: 0;
  border-radius: 0;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}

input:focus-visible {
  outline: none;
}

input:focus-visible::-webkit-slider-thumb {
  background: var(--text);
}

strong {
  flex: none;
  width: 108px;
  white-space: nowrap;
  font-family: var(--font-condensed);
  font-weight: 400;
  font-size: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

strong.off {
  color: var(--muted);
}
</style>
