<script setup>
import { computed } from "vue"
import { MODES, MODE_RULES, RULES } from "../lib/rules.js"
import MenuScreen from "./MenuScreen.vue"
import RuleSwitches from "./RuleSwitches.vue"
import StartRow from "./StartRow.vue"
import TickerNumber from "./TickerNumber.vue"

const GAME_NAMES = { both: "Both games", hzd: "Zero Dawn", hfw: "Forbidden West", custom: "Custom locations" }

const props = defineProps({ visible: Boolean, ready: Boolean, scored: Boolean, available: Number, rounds: Number, games: String, mode: String, customRules: Object, best: Number, last: Number, average: Number, phone: Boolean })
const emit = defineEmits(["start", "mode", "rule", "customise"])

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
        <button v-for="option in MODES" :key="option.id" class="choice option" :class="{ selected: mode === option.id }" type="button" role="radio" :aria-checked="mode === option.id" @click="emit('mode', option.id)"><strong>{{ option.name }}</strong></button>
      </div>
      <div class="collapse" :class="{ open: !custom }" :inert="custom">
        <div class="collapse-inner">
          <ul class="features" aria-label="What this mode gives you">
            <li v-for="rule in RULES" :key="rule.id" :class="{ off: !modeRules[rule.id] }" :aria-label="`${rule.name}: ${modeRules[rule.id] ? 'on' : 'off'}`"><svg viewBox="0 0 12 12" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path class="tick" d="M2 6.5 5 9.5 10 2.5" /><path class="cross" d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>{{ rule.name }}</li>
          </ul>
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
    <StartRow class="rise" style="--i: 5" :ready="ready" :available="available" :rounds="rounds" :text="customising ? 'Customise' : 'Start'" @go="emit(customising ? 'customise' : 'start')" />
    <div class="rise" style="--i: 6">
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
  font-family: var(--font-condensed);
  font-weight: 400;
  font-size: 20px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.features {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  gap: 8px 36px;
  margin: 0;
  padding: 8px 0 0;
  list-style: none;
  font-size: 15px;
}

.features li {
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.25s ease, opacity 0.25s ease;
}

.features svg {
  flex: none;
  color: var(--accent);
  transition: color 0.25s ease;
}

.features path {
  transition: opacity 0.2s ease;
}

.features .cross, .features .off .tick {
  opacity: 0;
}

.features .off {
  color: var(--muted);
  opacity: 0.6;
}

.features .off svg {
  color: var(--muted);
}

.features .off .cross {
  opacity: 1;
}

.unscored {
  margin: clamp(18px, 3.2vh, 34px) 0 0;
}

.cta {
  margin-top: clamp(4px, 1vh, 10px);
}

.stats {
  margin: clamp(18px, 3.2vh, 34px) 0 0;
}

@media (max-width: 760px) {
  .options, .features {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .features {
    gap: 6px 24px;
    font-size: 13px;
  }

  .features li {
    gap: 6px;
  }

  .features svg {
    width: 12px;
    height: 12px;
  }
}
</style>
