<script setup>
import AreaRules from "./AreaRules.vue"
import ArrowIcon from "./ArrowIcon.vue"
import MenuScreen from "./MenuScreen.vue"

defineProps({ visible: Boolean, ready: Boolean, available: Number, locationCounts: Object, tribes: Array, tribeFilter: Boolean, tribeCounts: Object, matched: Boolean, customRules: Object })
const emit = defineEmits(["rule", "tribe-filter", "next"])
</script>

<template>
  <MenuScreen :visible="visible">
    <p class="eyebrow rise" style="--i: 1">New game</p>
    <h1 class="screen-title rise" style="--i: 2"><span>Custom</span><span class="outline">Areas</span></h1>
    <AreaRules class="rise" style="--i: 3" :custom-rules="customRules" :location-counts="locationCounts" :tribes="tribes" :tribe-filter="tribeFilter" :tribe-counts="tribeCounts" :matched="matched" @rule="(id, on) => emit('rule', id, on)" @tribe-filter="on => emit('tribe-filter', on)" />
    <div class="cta rise" style="--i: 4">
      <button class="action" type="button" :disabled="!ready || !available" @click="emit('next')">Next<ArrowIcon /></button>
    </div>
  </MenuScreen>
</template>

<style scoped>
.cta {
  margin-top: clamp(18px, 3vh, 30px);
}
</style>
