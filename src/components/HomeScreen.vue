<script setup>
import { computed } from "vue"
import ArrowIcon from "./ArrowIcon.vue"
import HomeAbout from "./HomeAbout.vue"
import MenuScreen from "./MenuScreen.vue"
import SlapTitle from "./SlapTitle.vue"

const props = defineProps({ visible: Boolean, count: Number, found: Number, ready: Boolean, best: Number, last: Number, average: Number })
const emit = defineEmits(["play", "atlas", "fold"])

const countLabel = computed(() => props.count ? `${props.count} locations` : "")
const bestLabel = computed(() => props.best ? props.best.toLocaleString() : "None yet")
const lastLabel = computed(() => props.last === null || props.last === undefined ? "None yet" : props.last.toLocaleString())
const averageLabel = computed(() => props.average === null || props.average === undefined ? "None yet" : props.average.toLocaleString())

function play() {
  emit("play")
}
</script>

<template>
  <MenuScreen class="home" :visible="visible" label="Photosphere guessing game" :width="640" @fold="bottom => emit('fold', bottom)">
    <template #top>
      <span class="count rise">{{ countLabel }}</span>
    </template>
    <p class="eyebrow rise" style="--i: 1">Guess the location</p>
    <SlapTitle :visible="visible" text="Wayfinder" />
    <p class="lede rise" style="--i: 3">Each round puts you somewhere in Horizon Zero Dawn or Horizon Forbidden West. Have a look around, then drop a pin on the map where you think you are.</p>
    <div class="button-row rise" style="--i: 4">
      <button class="action" type="button" :disabled="!ready" @click="play">Play<ArrowIcon /></button>
      <button class="secondary action atlas" type="button" :disabled="!ready" @click="emit('atlas')">View Map<small>{{ found }} found</small></button>
    </div>
    <ol class="steps rise" style="--i: 5">
      <li><em>01</em><strong>Look around</strong><span>Drag to turn, scroll to zoom in on the details.</span></li>
      <li><em>02</em><strong>Pin the map</strong><span>Hover the map and click where you think you are.</span></li>
      <li><em>03</em><strong>Score</strong><span>Up to 5,000 points a round. Closer scores more.</span></li>
    </ol>
    <template #bottom>
      <footer class="stat-row home-bottom rise" style="--i: 6">
        <div class="stat-block"><small class="label">Best score</small><strong>{{ bestLabel }}</strong></div>
        <div class="stat-block"><small class="label">Last game</small><strong>{{ lastLabel }}</strong></div>
        <div class="stat-block"><small class="label">Average</small><strong>{{ averageLabel }}</strong></div>
      </footer>
      <div id="home-credit"></div>
    </template>
    <template #after>
      <HomeAbout :count="count" />
    </template>
  </MenuScreen>
</template>

<style scoped>
.button-row {
  width: fit-content;
}

.atlas {
  align-items: baseline;
}

.atlas small {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--muted);
  transition: color 0.2s ease;
}

.atlas:hover:not(:disabled) small {
  color: var(--text);
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  max-width: 640px;
  margin: clamp(22px, 4.5vh, 56px) 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}

.steps li {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 18px 22px 0 0;
}

.steps li + li {
  padding-left: 22px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.steps em {
  font-family: var(--font-condensed);
  font-style: normal;
  font-size: 22px;
  color: var(--accent);
}

.steps strong {
  font-size: 15px;
}

.steps span {
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

#home-credit {
  display: contents;
}

.home-bottom {
  align-items: flex-end;
}

@media (max-height: 760px) and (min-width: 761px) {
  .steps {
    display: none;
  }
}

@media (max-width: 560px) {
  .button-row {
    width: auto;
  }

  .atlas small {
    display: none;
  }
}

@media (max-width: 760px) {
  .steps, .count {
    display: none;
  }
}
</style>
