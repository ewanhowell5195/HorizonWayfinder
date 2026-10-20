<script setup>
import { RULES } from "../lib/rules.js"

defineProps({ rules: Object })
</script>

<template>
  <ul class="features" aria-label="What this mode gives you">
    <li v-for="rule in RULES" :key="rule.id" :class="{ off: !rules[rule.id] }" :aria-label="`${rule.name}: ${rules[rule.id] ? 'on' : 'off'}`"><svg viewBox="0 0 12 12" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path class="tick" d="M2 6.5 5 9.5 10 2.5" /><path class="cross" d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>{{ rule.name }}</li>
  </ul>
</template>

<style scoped>
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

@media (max-width: 760px) {
  .features {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
