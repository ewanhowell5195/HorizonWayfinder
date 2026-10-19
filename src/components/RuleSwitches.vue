<script setup>
import { RULES } from "../lib/rules.js"

defineProps({ customRules: Object })
const emit = defineEmits(["rule"])
</script>

<template>
  <div class="rules">
    <button v-for="rule in RULES" :key="rule.id" class="choice rule" :class="{ on: customRules[rule.id] }" type="button" role="switch" :aria-checked="customRules[rule.id]" @click="emit('rule', rule.id, !customRules[rule.id])"><span class="switch"></span><strong>{{ rule.name }}</strong><span>{{ rule.detail }}</span></button>
  </div>
</template>
