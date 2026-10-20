<script setup>
import { computed } from "vue"
import { MAX_POINTS } from "../lib/game.js"
import { LOCATIONS, MODES, MODE_NAMES, locationNames, missingRules, modeOf, timeLabel, tribesOf } from "../lib/rules.js"
import ArrowIcon from "./ArrowIcon.vue"
import MenuScreen from "./MenuScreen.vue"
import SlapTitle from "./SlapTitle.vue"

const props = defineProps({ visible: Boolean, ready: Boolean, rules: Object, games: String, rounds: Number, time: Number, score: Number, error: String })
const emit = defineEmits(["play"])

const hasScore = computed(() => props.score !== null && props.score !== undefined)
const mode = computed(() => props.rules ? modeOf(props.rules) : "normal")
const modeName = computed(() => MODE_NAMES[mode.value])
const missing = computed(() => props.rules ? missingRules(props.rules) : [])
const modeDetail = computed(() => mode.value !== "custom" ? MODES.find(option => option.id === mode.value).summary : missing.value.length ? `No ${new Intl.ListFormat("en", { type: "disjunction" }).format(missing.value)}` : "Everything on")
const gameName = computed(() => ({ hzd: "Zero Dawn", hfw: "Forbidden West" })[props.games] || "Both games")
const someLocations = computed(() => props.rules && LOCATIONS.some(location => !props.rules[location.id]))
const placeDetail = computed(() => someLocations.value ? new Intl.ListFormat("en").format(locationNames(props.rules)) : props.games === "hzd" || props.games === "hfw" ? `Horizon ${gameName.value} only` : "Zero Dawn and Forbidden West")
const tribeDetail = computed(() => {
  const named = tribesOf(props.games).filter(tribe => tribe.tribe)
  const on = named.filter(tribe => props.rules?.[tribe.id]).map(tribe => tribe.name)
  const off = named.filter(tribe => props.rules && !props.rules[tribe.id]).map(tribe => tribe.name)
  if (!off.length) {
    return ""
  }
  return on.length < off.length ? `only ${new Intl.ListFormat("en").format(on)}` : `no ${new Intl.ListFormat("en", { type: "disjunction" }).format(off)}`
})
const gameDetail = computed(() => tribeDetail.value ? `${placeDetail.value}, ${tribeDetail.value}` : placeDetail.value)

function play() {
  emit("play")
}
</script>

<template>
  <MenuScreen :visible="visible">
    <p class="eyebrow rise" style="--i: 1">Shared game</p>
    <SlapTitle :visible="visible" text="Challenge" />
    <p class="lede rise" style="--i: 3">Someone sent you this game. Same photospheres, same views, in the same order.</p>
    <div class="details rise" style="--i: 4">
      <div class="stat-block detail"><small class="label">Rounds</small><strong>{{ rounds }}</strong><span>Up to {{ (rounds * MAX_POINTS).toLocaleString() }} points</span></div>
      <div class="stat-block detail"><small class="label">Game</small><strong>{{ gameName }}</strong><span>{{ gameDetail }}</span></div>
      <div class="stat-block detail"><small class="label">Mode</small><strong>{{ modeName }}</strong><span>{{ modeDetail }}</span></div>
      <div v-if="time" class="stat-block detail"><small class="label">Time</small><strong>{{ timeLabel(time) }}</strong><span>Per round</span></div>
      <div v-if="hasScore" class="stat-block detail target"><small class="label">Score to beat</small><strong>{{ score.toLocaleString() }}</strong><span>out of {{ (rounds * MAX_POINTS).toLocaleString() }}</span></div>
    </div>
    <div class="rise" style="--i: 5">
      <button class="action" type="button" :disabled="!ready" @click="play">Play this game<ArrowIcon /></button>
    </div>
    <p v-if="error" class="error rise" style="--i: 6">{{ error }}</p>
  </MenuScreen>
</template>

<style scoped>
.details {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 clamp(16px, 2.8vh, 30px);
}

.detail {
  min-width: 170px;
  padding: 12px 16px;
  background: var(--field);
  border: 1px solid var(--border);
}

.detail span {
  font-size: 12px;
  color: var(--muted);
}

.detail.target {
  background: var(--accent-tint);
  border-color: var(--accent);
}

.detail.target strong {
  color: var(--accent);
}

.error {
  margin: 16px 0 0;
  font-size: 13px;
  color: var(--error);
}

@media (max-width: 760px) {
  .detail {
    flex: 1;
    min-width: 130px;
  }
}
</style>
