<script setup>
import { computed } from "vue"
import { GAME_NAMES, MODES, MODE_RULES } from "../lib/rules.js"
import MenuScreen from "./MenuScreen.vue"
import RuleList from "./RuleList.vue"
import RuleSwitches from "./RuleSwitches.vue"
import StartRow from "./StartRow.vue"
import TimeSlider from "./TimeSlider.vue"
import TickerNumber from "./TickerNumber.vue"

const props = defineProps({ visible: Boolean, ready: Boolean, scored: Boolean, available: Number, rounds: Number, games: String, mode: String, customRules: Object, best: Number, last: Number, average: Number, phone: Boolean, time: Number })
const emit = defineEmits(["start", "mode", "rule", "customise", "time"])

const custom = computed(() => props.mode === "custom")
const inlineRules = computed(() => custom.value && !props.phone)
const customising = computed(() => custom.value && props.phone)
const modeRules = computed(() => MODE_RULES[props.mode] || {})
</script>

<template>
  <MenuScreen :visible="visible">
    <p class="eyebrow rise" style="--i: 1">{{ GAME_NAMES[games] }}</p>
    <h1 class="screen-title rise" style="--i: 2"><span>Game</span><span class="outline">Setup</span></h1>
    <div class="group rise" style="--i: 3">
      <small class="label">Mode</small>
      <div class="options" role="radiogroup" aria-label="Mode">
        <button v-for="option in MODES" :key="option.id" class="choice option" :class="{ selected: mode === option.id }" type="button" role="radio" :aria-checked="mode === option.id" @click="emit('mode', option.id)"><strong class="caps">{{ option.name }}</strong></button>
      </div>
      <div class="collapse" :class="{ open: !custom }" :inert="custom">
        <div class="collapse-inner">
          <RuleList :rules="modeRules" />
        </div>
      </div>
    </div>
    <div class="rise" style="--i: 4">
      <div class="collapse" :class="{ open: inlineRules }" :inert="!inlineRules">
        <div class="collapse-inner">
          <div class="group">
            <small class="label">Custom rules</small>
            <RuleSwitches :custom-rules="customRules" @rule="(id, on) => emit('rule', id, on)" />
          </div>
        </div>
      </div>
    </div>
    <div class="group rise" style="--i: 5">
      <small class="label">Time per round</small>
      <TimeSlider :seconds="time" @change="seconds => emit('time', seconds)" />
    </div>
    <StartRow class="rise" style="--i: 6" :ready="ready" :available="available" :rounds="rounds" :text="customising ? 'Customise' : 'Start'" @go="emit(customising ? 'customise' : 'start')" />
    <div class="rise" style="--i: 7">
      <div class="collapse" :class="{ open: !scored }" :inert="scored">
        <div class="collapse-inner">
          <p class="unscored">Custom games are not scored, but you can still share them.</p>
        </div>
      </div>
      <div class="collapse" :class="{ open: scored }" :inert="!scored">
        <div class="collapse-inner">
          <div class="stat-row stats">
            <div class="stat-block"><small class="label">Best score</small><strong><TickerNumber :value="best" :pad="5" /></strong></div>
            <div class="stat-block"><small class="label">Last game</small><strong><TickerNumber :value="last" :pad="5" /></strong></div>
            <div class="stat-block"><small class="label">Average</small><strong><TickerNumber :value="average" :pad="5" /></strong></div>
          </div>
        </div>
      </div>
    </div>
  </MenuScreen>
</template>

<style scoped>
.group {
  display: grid;
  gap: 8px;
  margin: 0 0 clamp(14px, 2.4vh, 24px);
}

.options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.option {
  padding: 10px 14px;
}

.option strong {
  font-size: 20px;
}

.cta {
  margin-top: clamp(4px, 1vh, 10px);
}

.stats {
  margin: clamp(18px, 3.2vh, 34px) 0 0;
}

@media (max-width: 760px) {
  .options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
