<script setup>
import { computed, ref, watch } from "vue"
import { formatDistance } from "../lib/game.js"

const props = defineProps({ visible: Boolean, ready: Boolean, found: Number, total: Number, dev: Boolean, selected: Object, tab: String })
const emit = defineEmits(["tab", "view"])
const TABS = [{ id: "map", name: "Map" }, { id: "photospheres", name: "Photospheres" }]
const tabs = computed(() => props.dev ? TABS.concat({ id: "dev", name: "Dev" }) : TABS)
const shown = ref(null)
const devOpen = computed(() => props.tab === "dev" && Boolean(props.selected))

watch(() => props.selected, selected => {
  if (selected) {
    shown.value = selected
  }
})
</script>

<template>
  <section class="atlas" :class="{ visible, ready }">
    <header class="screen-top">
      <span class="mark mark-slot" aria-hidden="true"><i class="mark-emblem"></i>Horizon Wayfinder</span>
    </header>
    <div class="panel atlas-card">
      <nav class="atlas-tabs" role="tablist">
        <button v-for="option in tabs" :key="option.id" type="button" role="tab" :class="{ selected: tab === option.id }" :aria-selected="tab === option.id" @click="emit('tab', option.id)">{{ option.name }}</button>
      </nav>
      <div class="atlas-extra collapse" :class="{ open: tab === 'photospheres' }">
        <div class="collapse-inner">
          <strong><i class="key" aria-hidden="true"></i>{{ found }} / {{ total }} found</strong>
        </div>
      </div>
      <div class="atlas-extra collapse" :class="{ open: devOpen }">
        <div class="collapse-inner">
          <div v-if="shown" class="dev-info">
            <strong>{{ shown.title }}</strong>
            <code>{{ shown.name }}</code>
            <dl>
              <dt>Guesses</dt>
              <dd>{{ shown.count }}</dd>
              <template v-if="shown.count">
                <dt>Average score</dt>
                <dd>{{ shown.average.toLocaleString("en") }}</dd>
                <dt>Average distance</dt>
                <dd>{{ formatDistance(shown.distance) }}</dd>
                <dt>Difficulty</dt>
                <dd>{{ shown.difficulty }} / 10</dd>
              </template>
            </dl>
            <div class="button-row">
              <button type="button" @click="emit('view')">View photosphere</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.atlas {
  position: fixed;
  inset: 0;
  z-index: 6;
  display: grid;
  grid-template-rows: auto 1fr;
  align-content: start;
  gap: 18px;
  padding: clamp(20px, 3.6vh, 34px) 56px;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.45s ease, visibility 0s linear 0.45s;
}

.atlas.visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.45s ease;
}

.atlas-card {
  position: fixed;
  top: clamp(20px, 3.6vh, 34px);
  right: 56px;
  display: grid;
  padding: 4px;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.45s ease;
}

.atlas.ready .atlas-card {
  opacity: 1;
}

.atlas-tabs {
  display: flex;
  gap: 4px;
}

.atlas-tabs button {
  flex: 1;
  padding: 8px 16px;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: var(--muted);
  background: none;
  transition: color 0.2s ease, background 0.2s ease;
}

.atlas-tabs button:hover {
  color: var(--text);
  filter: none;
}

.atlas-tabs button.selected {
  color: var(--text);
  background: rgba(255, 255, 255, 0.12);
}

.atlas-extra strong {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 8px;
  font-family: var(--font-condensed);
  font-weight: 400;
  font-size: 24px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dev-info {
  display: grid;
  gap: 10px;
  padding: 14px 12px 8px;
}

.dev-info strong {
  padding: 0;
  font-family: var(--font-condensed);
  font-weight: 400;
  font-size: 24px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dev-info code {
  color: var(--muted);
  font-size: 12px;
}

.dev-info dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 16px;
  margin: 0;
  font-size: 14px;
}

.dev-info dt {
  color: var(--muted);
}

.dev-info dd {
  margin: 0;
  text-align: right;
}

.dev-info .button-row {
  margin-top: 4px;
}

.key {
  height: 1.1em;
  aspect-ratio: 64 / 72;
  background: currentColor;
  mask: url(/glyphs/key.webp) center / contain no-repeat;
}

@media (max-width: 760px) {
  .atlas {
    padding: 22px 20px 24px;
  }

  .atlas-card {
    top: 64px;
    left: 20px;
    right: 20px;
  }
}
</style>
