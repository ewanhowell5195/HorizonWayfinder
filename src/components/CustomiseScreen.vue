<script setup>
import MenuScreen from "./MenuScreen.vue"
import RuleSwitches from "./RuleSwitches.vue"
import StartRow from "./StartRow.vue"

defineProps({ visible: Boolean, ready: Boolean, available: Number, rounds: Number, customRules: Object })
const emit = defineEmits(["start", "rule"])
</script>

<template>
  <MenuScreen :visible="visible">
    <p class="eyebrow rise" style="--i: 1">Custom mode</p>
    <h1 class="screen-title rise" style="--i: 2"><span>Custom</span><span class="outline">Rules</span></h1>
    <RuleSwitches class="rise" style="--i: 3" :custom-rules="customRules" @rule="(id, on) => emit('rule', id, on)" />
    <StartRow class="rise" style="--i: 4" :ready="ready" :available="available" :rounds="rounds" @go="emit('start')" />
    <p class="unscored rise" style="--i: 5">Custom games are not scored, but you can still share them.</p>
  </MenuScreen>
</template>
