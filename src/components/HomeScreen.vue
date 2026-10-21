<script setup>
import { computed } from "vue"
import ArrowIcon from "./ArrowIcon.vue"
import HomeAbout from "./HomeAbout.vue"
import MenuScreen from "./MenuScreen.vue"
import SlapTitle from "./SlapTitle.vue"

const props = defineProps({ visible: Boolean, count: Number, found: Number, ready: Boolean, best: Number, last: Number, average: Number })
const emit = defineEmits(["play", "quick", "atlas", "fold", "scores"])
const played = computed(() => props.best !== null && props.best !== undefined)

const countLabel = computed(() => props.count ? `${props.count} locations` : "")
const bestLabel = computed(() => props.best ? props.best.toLocaleString() : "None yet")
const lastLabel = computed(() => props.last === null || props.last === undefined ? "None yet" : props.last.toLocaleString())
const averageLabel = computed(() => props.average === null || props.average === undefined ? "None yet" : props.average.toLocaleString())

function play() {
  emit("play")
}
</script>

<template>
  <MenuScreen class="home" :visible="visible" :width="640" @fold="bottom => emit('fold', bottom)">
    <template #top>
      <span class="count rise">{{ countLabel }}</span>
    </template>
    <p class="eyebrow rise" style="--i: 1">Guess the location</p>
    <SlapTitle :visible="visible" text="Wayfinder" />
    <p class="lede rise" style="--i: 3">Each round puts you somewhere in Horizon Zero Dawn or Horizon Forbidden West. Have a look around, then drop a pin on the map where you think you are.</p>
    <div class="button-row stack rise" style="--i: 4">
      <button class="action above" type="button" :disabled="!ready" @click="play">Play<ArrowIcon /></button>
      <button class="secondary bright action above" type="button" :disabled="!ready" @click="emit('quick')">Quick start</button>
      <button class="secondary action atlas below" type="button" :disabled="!ready" @click="emit('atlas')">View Map<small v-if="found">{{ found }} found</small></button>
    </div>
    <ol class="steps rise" style="--i: 5">
      <li><em>01</em><strong>Look around</strong><span>Drag to turn, scroll to zoom in on the details.</span></li>
      <li><em>02</em><strong>Pin the map</strong><span>Hover the map and click where you think you are.</span></li>
      <li><em>03</em><strong>Score</strong><span>Up to 5,000 points a round. Closer scores more.</span></li>
    </ol>
    <template #bottom>
      <footer class="home-bottom rise" style="--i: 6">
        <button class="stat-row scores-link" type="button" :disabled="!played" :title="played ? 'All scores' : null" @click="emit('scores')">
          <span class="stat-block"><small class="label">Best score</small><strong>{{ bestLabel }}</strong></span>
          <span class="stat-block"><small class="label">Last game</small><strong>{{ lastLabel }}</strong></span>
          <span class="stat-block"><small class="label">Average</small><strong>{{ averageLabel }}</strong></span>
          <ArrowIcon v-if="played" class="scores-arrow" />
        </button>
      </footer>
      <div id="home-credit"></div>
    </template>
    <template #after>
      <HomeAbout :count="count" @play="play" />
    </template>
  </MenuScreen>
</template>

<style scoped>
.button-row {
  grid-auto-columns: auto;
  width: max-content;
}

@media (min-width: 761px) {
  .button-row > * {
    min-width: 202px;
  }
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
  display: flex;
  align-items: flex-end;
}

.scores-link {
  align-items: flex-end;
  padding: 0;
  font-weight: 400;
  letter-spacing: normal;
  text-align: left;
  color: var(--text);
  background: none;
}

.scores-link:disabled {
  opacity: 1;
  cursor: default;
}

.scores-link .label {
  transition: color 0.2s ease;
}

.scores-link:hover:not(:disabled) {
  filter: none;
}

.scores-link:hover:not(:disabled) .label {
  color: var(--text);
}

.scores-arrow {
  align-self: center;
  color: var(--muted);
  transition: color 0.2s ease, translate 0.25s ease;
}

.scores-link:hover:not(:disabled) .scores-arrow {
  color: var(--accent);
  translate: 4px 0;
}

@media (max-height: 760px) and (min-width: 761px) {
  .steps {
    display: none;
  }
}

@media (max-width: 760px) {
  .button-row {
    grid-template-columns: 1fr 1fr;
  }

  .button-row.stack > .action {
    min-width: calc((100vw - 40px) / 3);
  }

  .button-row > .action.above:first-child {
    clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--step)), var(--step) calc(100% - var(--step)), 0 calc(100% - var(--step) * 2));
  }

  .button-row > .action.bright {
    clip-path: polygon(calc(-1 * var(--tuck)) 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, calc(100% - var(--step)) calc(100% - var(--step)), 0 calc(100% - var(--step)), 0 var(--tuck));
  }

  .button-row > .atlas {
    grid-column: 1 / -1;
  }

  .atlas small {
    display: none;
  }

  .steps, .count {
    display: none;
  }
}

@media (max-width: 420px) {
  .button-row {
    width: auto;
  }
}
</style>
