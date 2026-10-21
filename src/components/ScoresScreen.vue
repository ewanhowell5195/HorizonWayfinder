<script setup>
import { GAME_NAMES, timeLabel } from "../lib/rules.js"
import MenuScreen from "./MenuScreen.vue"

defineProps({ visible: Boolean, groups: Array })

function score(value) {
  return value === null ? "None" : value.toLocaleString()
}
</script>

<template>
  <MenuScreen :visible="visible" :width="760">
    <p class="eyebrow rise" style="--i: 1">Your record</p>
    <h1 class="screen-title rise" style="--i: 2"><span>All</span><span class="outline">Scores</span></h1>
    <p v-if="!groups.length" class="unscored rise" style="--i: 3">Finish a game in Easy, Normal or Hard to start your record.</p>
    <section v-for="(group, n) in groups" :key="group.mode" class="group rise" :style="{ '--i': n + 3 }">
      <h2 class="caps">{{ group.name }}</h2>
      <div class="table" role="table" :aria-label="`${group.name} scores`">
        <div class="row head" role="row">
          <span role="columnheader">Area</span>
          <span role="columnheader">Best</span>
          <span role="columnheader">Last</span>
          <span role="columnheader">Average</span>
          <span role="columnheader">Games</span>
        </div>
        <div v-for="row in group.rows" :key="row.key" class="row" role="row">
          <span role="cell" class="area">{{ GAME_NAMES[row.games] }}<small v-if="row.time">{{ timeLabel(row.time) }}</small></span>
          <strong role="cell" class="best">{{ score(row.best) }}</strong>
          <span role="cell">{{ score(row.last) }}</span>
          <span role="cell">{{ score(row.average) }}</span>
          <span role="cell">{{ row.played }}</span>
        </div>
      </div>
    </section>
  </MenuScreen>
</template>

<style scoped>
.group {
  margin: 0 0 clamp(18px, 3vh, 28px);
}

h2 {
  margin: 0 0 8px;
  font-size: 22px;
  color: var(--accent);
}

.table {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(4, max-content);
  --column-gap: 28px;
}

.row {
  display: contents;
}

.row > * {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.row > * + * {
  padding-left: var(--column-gap);
}

.row > .area {
  display: flex;
  align-items: baseline;
  gap: 10px;
  text-align: left;
}

.area small {
  font-size: 12px;
  color: var(--muted);
}

.head > * {
  padding-top: 0;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}

.head > :first-child {
  text-align: left;
}

.best {
  color: var(--accent);
}

@media (max-width: 760px) {
  .table {
    --column-gap: 14px;
    font-size: 13px;
  }

  .row > .area {
    flex-direction: column;
    gap: 0;
  }
}
</style>
