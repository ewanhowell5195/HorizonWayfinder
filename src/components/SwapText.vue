<script setup>
defineProps({ text: String })
</script>

<template>
  <Transition name="swap-text" mode="out-in">
    <span :key="text" class="swap-text">{{ text }}<slot /></span>
  </Transition>
</template>

<style scoped>
.swap-text {
  display: inline-flex;
  align-items: center;
  gap: inherit;
}

.swap-text-enter-active, .swap-text-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.swap-text-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.swap-text-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
