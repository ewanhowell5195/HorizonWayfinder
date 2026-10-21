<script setup>
import { onMounted, ref, watch } from "vue"
import { createCompass } from "../lib/compass.js"

const props = defineProps({ heading: Number, boxed: Boolean, faded: Boolean, raised: Boolean, placement: String })

const host = ref(null)
const compass = createCompass()

onMounted(() => {
  host.value.append(compass.element)
  compass.setHeading(props.heading)
})

watch(() => props.heading, value => compass.setHeading(value))
</script>

<template>
  <div ref="host" class="hud-compass" :class="[placement, { boxed, faded, raised }]"></div>
</template>

<style scoped>
.hud-compass {
  --u: calc(100vh / 1080);
  position: absolute;
  top: calc(28.5px - 10.5 * var(--u));
  left: 50%;
  width: calc(630 * var(--u));
  transform: translateX(-50%);
  pointer-events: none;
  transition: opacity 0.2s ease, top 0.3s ease;
}

.hud-compass.faded {
  opacity: 0;
}

.hud-compass.boxed {
  --u: min(100vh / 1080, 65cqw / 630);
  z-index: 1;
  top: calc(10px + 7 * var(--u));
  width: calc(630 * var(--u));
}

.hud-compass.below:not(.boxed) {
  top: 76px;
  width: min(630 * var(--u), 100%);
}

@media (hover: none), (max-width: 640px) {
  .hud-compass.below:not(.boxed) {
    top: 64px;
  }
}

.hud-compass.below.raised:not(.boxed) {
  top: calc(28.5px - 10.5 * var(--u));
}
</style>
