<script setup>
import { computed } from "vue"
import { MAX_POINTS } from "../lib/game.js"
import ArrowIcon from "./ArrowIcon.vue"
import SwapText from "./SwapText.vue"

const props = defineProps({ ready: Boolean, available: Number, rounds: Number, text: { type: String, default: "Start" } })
const emit = defineEmits(["go"])

const count = computed(() => props.available || 0)
const roundsLabel = computed(() => count.value ? `${props.rounds} rounds` : "No photospheres yet")
const maxLabel = computed(() => count.value ? `Up to ${(props.rounds * MAX_POINTS).toLocaleString()} points` : "Capture some to play")
</script>

<template>
  <div class="cta">
    <button class="action" type="button" :disabled="!ready || !count" @click="emit('go')"><SwapText :text="text"><ArrowIcon /></SwapText></button>
    <div class="cta-meta"><strong>{{ roundsLabel }}</strong><span>{{ maxLabel }}</span></div>
  </div>
</template>

<style scoped>
.cta {
  display: flex;
  align-items: center;
  gap: 24px;
}

.cta-meta {
  display: grid;
  gap: 2px;
  font-size: 13px;
  color: var(--muted);
}

.cta-meta strong {
  font-size: 15px;
  color: var(--text);
}
</style>
