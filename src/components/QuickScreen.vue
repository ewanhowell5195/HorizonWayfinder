<script setup>
import { computed } from "vue"
import { MAX_POINTS, plural } from "../lib/game.js"
import { GAME_NAMES, MODE_NAMES, MODE_RULES, timeLabel } from "../lib/rules.js"
import ArrowIcon from "./ArrowIcon.vue"
import MenuScreen from "./MenuScreen.vue"
import RuleList from "./RuleList.vue"

const props = defineProps({ visible: Boolean, ready: Boolean, scored: Boolean, available: Number, rounds: Number, games: String, mode: String, customRules: Object, time: Number })
const emit = defineEmits(["start", "change"])

const modeRules = computed(() => props.mode === "custom" ? props.customRules : MODE_RULES[props.mode] || {})
const locations = computed(() => plural(props.available || 0, "location"))
const points = computed(() => `${props.rounds} rounds, up to ${(props.rounds * MAX_POINTS).toLocaleString()} points`)
</script>

<template>
  <MenuScreen :visible="visible">
    <p class="eyebrow rise" style="--i: 1">{{ games === "both" && mode === "normal" && !time ? "Default setup" : "Your last setup" }}</p>
    <h1 class="screen-title rise" style="--i: 2"><span>Quick</span><span class="outline">Start</span></h1>
    <div class="summary rise" style="--i: 3">
      <div class="item">
        <small class="label">Area</small>
        <strong class="caps">{{ GAME_NAMES[games] }}</strong>
        <span>{{ locations }}</span>
      </div>
      <div class="item">
        <small class="label">Mode</small>
        <strong class="caps">{{ MODE_NAMES[mode] || "Custom" }}</strong>
        <span>{{ points }}</span>
      </div>
      <div class="item">
        <small class="label">Time</small>
        <strong class="caps">{{ timeLabel(time) }}</strong>
        <span>{{ time ? "Per round" : "No time limit" }}</span>
      </div>
    </div>
    <RuleList class="rise" style="--i: 4" :rules="modeRules" />
    <div class="button-row rise" style="--i: 5">
      <button class="action" type="button" :disabled="!ready || !available" @click="emit('start')">Start<ArrowIcon /></button>
      <button class="secondary action" type="button" @click="emit('change')">Change</button>
    </div>
    <p v-if="!scored" class="unscored rise" style="--i: 6">Custom games are not scored, but you can still share them.</p>
  </MenuScreen>
</template>

<style scoped>
.summary {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  gap: 12px 56px;
}

.item {
  display: grid;
  gap: 4px;
}

.item strong {
  font-size: 24px;
}

.item span {
  font-size: 13px;
  color: var(--muted);
}

.features {
  margin: clamp(10px, 2vh, 18px) 0 0;
}

.button-row {
  width: fit-content;
  margin-top: clamp(22px, 4vh, 40px);
}

@media (max-width: 760px) {
  .summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 24px;
  }

  .item strong {
    font-size: 20px;
  }
}

@media (max-width: 420px) {
  .button-row {
    width: auto;
  }
}
</style>
