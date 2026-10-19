<script setup>
import { nextTick, ref, watch } from "vue"
import { LOCATIONS } from "../lib/rules.js"

const props = defineProps({ customRules: Object, locationCounts: Object, tribes: Array, tribeFilter: Boolean, tribeCounts: Object, matched: Boolean })
const emit = defineEmits(["rule", "tribe-filter"])
const rows = ["hzd", "hfw"].map(game => LOCATIONS.filter(location => location.game === game))
const tribeList = ref(null)

watch(() => props.tribes.map(tribe => tribe.id).join(), async () => {
  const list = tribeList.value?.$el
  if (!list) {
    return
  }
  const from = list.offsetHeight
  await nextTick()
  const to = list.offsetHeight
  if (from === to) {
    return
  }
  list.style.height = `${from}px`
  list.offsetHeight
  list.style.height = `${to}px`
  list.addEventListener("transitionend", function done(event) {
    if (event.target === list) {
      list.style.height = ""
      list.removeEventListener("transitionend", done)
    }
  })
})

function leaving(el) {
  el.style.left = `${el.offsetLeft}px`
  el.style.top = `${el.offsetTop}px`
  el.style.width = `${el.offsetWidth}px`
}

function unit(value) {
  return value === 1 ? "location" : "locations"
}

function plural(value) {
  return `${value} ${unit(value)}`
}
</script>

<template>
  <div>
    <div v-for="(row, n) in rows" :key="n" class="rules">
      <button v-for="location in row" :key="location.id" class="choice rule" :class="{ on: customRules[location.id] }" type="button" role="switch" :aria-checked="customRules[location.id]" @click="emit('rule', location.id, !customRules[location.id])"><span class="switch"></span><strong>{{ location.name }}</strong><span>{{ plural(locationCounts?.[location.id] || 0) }}</span></button>
    </div>
    <button class="toggle" :class="{ on: tribeFilter }" type="button" role="switch" :aria-checked="tribeFilter" @click="emit('tribe-filter', !tribeFilter)"><span class="switch"></span>Filter by tribe</button>
    <div class="collapse" :class="{ open: tribeFilter }" :inert="!tribeFilter">
      <div class="collapse-inner">
        <TransitionGroup ref="tribeList" tag="div" name="tribe" class="rules tribes" @before-leave="leaving">
          <button v-for="tribe in tribes" :key="tribe.id" class="choice rule" :class="{ on: customRules[tribe.id] }" type="button" role="switch" :aria-checked="customRules[tribe.id]" @click="emit('rule', tribe.id, !customRules[tribe.id])"><span class="switch"></span><strong>{{ tribe.name }}</strong><span>{{ tribeCounts?.[tribe.id] || 0 }}<span class="unit">{{ ` ${unit(tribeCounts?.[tribe.id] || 0)}` }}</span></span></button>
        </TransitionGroup>
      </div>
    </div>
    <div class="collapse" :class="{ open: !matched }" :inert="matched">
      <div class="collapse-inner">
        <p class="unscored">Your score will not be remembered for custom games.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tribes .rule {
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-height: 46px;
}

.tribes .rule .switch {
  grid-row: auto;
}

.tribes .rule > span:last-child {
  justify-self: end;
  padding-left: 2px;
  white-space: nowrap;
}

.rule > span:last-child {
  color: var(--muted);
}

.unit {
  display: none;
}

.rules {
  padding: 8px 0 0;
}

.rules:first-child {
  padding: 12px 0 0;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 20px 0 0;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
  background: none;
  transition: color 0.2s ease;
}

.toggle::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle.on::after {
  transform: none;
}

.toggle:hover, .toggle.on {
  color: var(--text);
  filter: none;
}

.tribes {
  position: relative;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  max-width: none;
  transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.tribe-move, .tribe-enter-active, .tribe-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
}

.tribe-enter-from, .tribe-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.tribe-leave-active {
  position: absolute;
}

.unscored {
  margin: 12px 0 0;
}

@media (max-width: 1840px) {
  .tribes {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    max-width: 768px;
  }
}

@media (max-width: 760px) {
  .tribes {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .tribes .rule {
    grid-template-columns: minmax(0, 1fr);
    align-content: center;
    min-height: 0;
    padding: 6px 8px;
  }

  .tribes .rule > span:last-child {
    justify-self: start;
    padding-left: 0;
  }

  .tribes .rule .switch {
    display: none;
  }

  .unit {
    display: inline;
  }

  .tribes .rule strong {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
