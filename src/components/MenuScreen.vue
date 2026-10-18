<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue"

const SCROLL_FADE_PX = 40
const COMPACT_MS = 450

defineProps({ visible: Boolean, label: { type: String, default: "Horizon Wayfinder" }, width: Number })
const emit = defineEmits(["fold"])
const fade = ref(0)
const scrolledPx = ref(0)
const compact = ref(false)
const section = ref(null)
const fold = ref(null)
const main = ref(null)
let saved = 0
let observer = null

function scrolled(event) {
  fade.value = Math.min(event.target.scrollTop / SCROLL_FADE_PX, 1)
  scrolledPx.value = event.target.scrollTop
  emit("fold", fold.value.offsetTop + fold.value.offsetHeight - event.target.scrollTop)
}

function available() {
  const style = getComputedStyle(section.value)
  const gap = parseFloat(getComputedStyle(section.value.classList.contains("scrolls") ? fold.value : section.value).rowGap)
  const rows = Array.from(fold.value.children).filter(child => child !== main.value && !["fixed", "absolute"].includes(getComputedStyle(child).position)).reduce((sum, child) => sum + child.offsetHeight, 0)
  return section.value.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - gap * 2 - rows
}

function moving() {
  const title = main.value.querySelector(".screen-title")
  if (!title) {
    return []
  }
  const after = []
  for (let next = title.nextElementSibling; next; next = next.nextElementSibling) {
    after.push(next)
  }
  return [title.lastElementChild].concat(after).map(element => ({ element, rect: element.getBoundingClientRect() }))
}

function glide(from) {
  for (const { element, rect } of from) {
    const now = element.getBoundingClientRect()
    element.style.transition = "none"
    element.style.transform = `translate(${rect.left - now.left}px, ${rect.top - now.top}px)`
  }
  main.value.offsetHeight
  for (const { element } of from) {
    element.style.transition = `transform ${COMPACT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
    element.style.transform = ""
  }
  setTimeout(() => from.forEach(({ element }) => element.style.transition = ""), COMPACT_MS)
}

async function toggleCompact(on) {
  const from = moving()
  const before = main.value.offsetHeight
  compact.value = on
  await nextTick()
  if (on) {
    saved = before - main.value.offsetHeight
  }
  glide(from)
}

function fit() {
  if (!section.value || !main.value) {
    return
  }
  const room = available()
  if (!compact.value && main.value.offsetHeight > room) {
    toggleCompact(true)
  } else if (compact.value && main.value.offsetHeight + saved <= room) {
    toggleCompact(false)
  }
}

onMounted(() => {
  observer = new ResizeObserver(fit)
  observer.observe(section.value)
  observer.observe(main.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section ref="section" class="screen" :class="{ visible, compact, scrolls: $slots.after }" :style="{ '--fade': fade, '--scrolled': `${scrolledPx}px` }" @scroll="scrolled">
    <div ref="fold" class="screen-fold">
      <header class="screen-top">
        <span class="mark mark-slot" aria-hidden="true"><i class="mark-emblem"></i>{{ label }}</span>
        <slot name="top" />
      </header>
      <div ref="main" class="screen-main" :style="width ? { maxWidth: `${width}px` } : null">
        <slot />
      </div>
      <slot name="bottom" />
    </div>
    <slot name="after" />
  </section>
</template>
