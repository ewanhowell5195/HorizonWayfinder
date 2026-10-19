<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue"
import { LOCATIONS } from "../lib/rules.js"
import AreaRules from "./AreaRules.vue"
import ArrowIcon from "./ArrowIcon.vue"
import MenuScreen from "./MenuScreen.vue"
import SwapText from "./SwapText.vue"

const GAMES = [
  { id: "both", name: "Both games", detail: "Zero Dawn and Forbidden West", glyph: ["one", "plus", "two"] },
  { id: "hzd", name: "Zero Dawn", detail: "Including The Frozen Wilds", glyph: ["one"] },
  { id: "hfw", name: "Forbidden West", detail: "Including Burning Shores", glyph: ["two"] },
  { id: "custom", name: "Custom", detail: "Pick the areas yourself", glyph: ["custom"] }
]

const props = defineProps({ visible: Boolean, ready: Boolean, counts: Object, locationCounts: Object, available: Number, games: String, preview: String, lit: Array, litTribes: Array, tribeAreas: Object, frames: Object, tribes: Array, tribeFilter: Boolean, tribeCounts: Object, matched: Boolean, customRules: Object, seed: String, seedError: String, phone: Boolean })
const emit = defineEmits(["games", "rule", "tribe-filter", "next", "seed", "customise"])
const seedText = ref(props.seed || "")
const custom = computed(() => props.games === "custom")
const inlineRules = computed(() => custom.value && !props.phone)
const customising = computed(() => custom.value && props.phone)
const maps = computed(() => props.games === "custom" || props.preview === "both" ? ["hzd", "hfw"] : props.preview ? [props.preview] : [])
const areas = Object.fromEntries(["hzd", "hfw"].map(game => [game, LOCATIONS.filter(location => location.game === game).map(location => location.id)]))
const MAP_GAP = 28
const mapsBox = reactive({ width: 0, height: 0 })
const imageSizes = reactive({})
const resize = new ResizeObserver(([entry]) => Object.assign(mapsBox, { width: entry.contentRect.width, height: entry.contentRect.height }))

function observeMaps(element) {
  resize.disconnect()
  if (element) {
    resize.observe(element)
  }
}

function measure(game, image) {
  imageSizes[game] ??= [image.naturalWidth, image.naturalHeight]
}

function mapRect(game) {
  const frame = props.frames?.[game], size = imageSizes[game]
  return frame && size && { minX: -frame.originX / frame.scale, maxX: (size[0] - frame.originX) / frame.scale, minY: (frame.originY - size[1]) / frame.scale, maxY: frame.originY / frame.scale }
}

const placement = computed(() => {
  const rects = maps.value.map(mapRect)
  const { width, height } = mapsBox
  if (!rects.length || rects.some(rect => !rect) || !width || !height) {
    return null
  }
  const union = { minX: Math.min(...rects.map(rect => rect.minX)), maxX: Math.max(...rects.map(rect => rect.maxX)), minY: Math.min(...rects.map(rect => rect.minY)), maxY: Math.max(...rects.map(rect => rect.maxY)) }
  const unionWidth = union.maxX - union.minX, unionHeight = union.maxY - union.minY
  const world = Math.min(width / unionWidth, height / unionHeight)
  const stackWidth = Math.max(...rects.map(rect => rect.maxX - rect.minX))
  const stackHeight = rects.reduce((sum, rect) => sum + rect.maxY - rect.minY, 0)
  const gaps = MAP_GAP * (rects.length - 1)
  const stacked = Math.min(width / stackWidth, (height - gaps) / stackHeight)
  const box = (left, top, rect, scale) => ({ left: `${left}px`, top: `${top}px`, width: `${(rect.maxX - rect.minX) * scale}px`, height: `${(rect.maxY - rect.minY) * scale}px` })
  if (world >= stacked) {
    const left = (width - unionWidth * world) / 2, top = (height - unionHeight * world) / 2
    return rects.map(rect => box(left + (rect.minX - union.minX) * world, top + (union.maxY - rect.maxY) * world, rect, world))
  }
  let top = (height - stackHeight * stacked - gaps) / 2
  return rects.map(rect => {
    const style = box((width - (rect.maxX - rect.minX) * stacked) / 2, top, rect, stacked)
    top += (rect.maxY - rect.minY) * stacked + MAP_GAP
    return style
  })
})

const wideQuery = matchMedia("(min-width: 1841px)")
const wide = ref(wideQuery.matches)
const updateWide = () => wide.value = wideQuery.matches
wideQuery.addEventListener("change", updateWide)

onBeforeUnmount(() => {
  resize.disconnect()
  wideQuery.removeEventListener("change", updateWide)
})

watch(() => props.seed, value => seedText.value = value || "")

function plural(value) {
  return `${value} location${value === 1 ? "" : "s"}`
}

function count(id) {
  if (id === "custom" && !custom.value) {
    return `Up to ${plural(props.counts?.both || 0)}`
  }
  return plural(id === "custom" ? props.available || 0 : props.counts?.[id] || 0)
}

function playSeed() {
  if (seedText.value.trim()) {
    emit("seed", seedText.value)
  }
}
</script>

<template>
  <MenuScreen :class="{ custom }" :visible="visible" :width="custom && tribeFilter && wide ? 962 : 900">
    <p class="eyebrow rise" style="--i: 1">New game</p>
    <h1 class="screen-title rise" style="--i: 2"><span>Choose</span><span class="outline">Area</span></h1>
    <div class="picks rise" style="--i: 3" role="radiogroup" aria-label="Area">
      <button v-for="option in GAMES" :key="option.id" class="choice pick" :class="{ selected: games === option.id }" type="button" role="radio" :aria-checked="games === option.id" @click="emit('games', option.id)">
        <b class="glyph" aria-hidden="true">
          <template v-for="mark in option.glyph" :key="mark">
            <svg v-if="mark === 'plus'" class="plus" viewBox="0 0 10 28" fill="currentColor"><rect y="12.5" width="10" height="3" /><rect x="3.5" y="9" width="3" height="10" /></svg>
            <i v-else :class="mark"></i>
          </template>
        </b>
        <strong>{{ option.name }}</strong>
        <span>{{ option.detail }}</span>
        <small>{{ count(option.id) }}</small>
      </button>
    </div>
    <div class="rise" style="--i: 4">
      <div class="collapse" :class="{ open: inlineRules }" :inert="!inlineRules">
        <div class="collapse-inner">
          <AreaRules :custom-rules="customRules" :location-counts="locationCounts" :tribes="tribes" :tribe-filter="tribeFilter" :tribe-counts="tribeCounts" :matched="matched" @rule="(id, on) => emit('rule', id, on)" @tribe-filter="on => emit('tribe-filter', on)" />
        </div>
      </div>
    </div>
    <div class="cta rise" style="--i: 5">
      <button class="action" type="button" :disabled="!ready || (!customising && !available)" @click="emit(customising ? 'customise' : 'next')"><SwapText :text="customising ? 'Customise' : 'Next'"><ArrowIcon /></SwapText></button>
    </div>
    <form class="seed rise" style="--i: 6" @submit.prevent="playSeed">
      <input v-model="seedText" type="text" spellcheck="false" autocomplete="off" placeholder="Paste a seed or link to replay a game" aria-label="Seed">
      <button class="secondary" type="submit" :disabled="!ready || !seedText.trim()">Play seed</button>
      <p v-if="seedError" class="seed-error">{{ seedError }}</p>
    </form>
    <template #bottom>
      <Transition name="maps" mode="out-in">
        <div :key="maps.join()" :ref="observeMaps" class="maps" :class="{ cramped: mapsBox.width < 200 }" aria-hidden="true">
          <div class="map-row" :class="{ placed: placement }">
            <div v-for="(game, n) in maps" :key="game" class="map" :style="placement?.[n]">
              <div class="glow">
                <template v-for="area in areas[game]" :key="area">
                  <img v-for="tribe in tribeAreas?.[game]?.[area]" :key="tribe" class="tribe" :class="{ off: !lit?.includes(area) || !litTribes?.includes(tribe) }" :style="{ '--mask': `url(/map/tribes/${game}-${tribe}.webp)` }" :src="`/backgrounds/area-${area}.avif`" alt="">
                  <img v-if="!tribeAreas" :class="{ off: !lit?.includes(area) }" :src="`/backgrounds/area-${area}.avif`" alt="">
                </template>
              </div>
              <img v-for="area in areas[game]" :key="area" class="area dim" :src="`/backgrounds/area-${area}.avif`" alt="" @load="event => measure(game, event.target)">
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </MenuScreen>
</template>

<style scoped>
.maps {
  position: fixed;
  top: 80px;
  bottom: 96px;
  left: calc(var(--fog-middle, 50vw) + 60px);
  right: 40px;
  pointer-events: none;
}

.maps.cramped {
  visibility: hidden;
}

.map-row {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
  height: 100%;
}

.map-row.placed {
  position: relative;
}

.map-row.placed .map {
  position: absolute;
}

.map {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
}

.glow {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 0 2px var(--accent)) drop-shadow(0 0 10px var(--accent));
}

.map img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
}

.glow img.off {
  opacity: 0;
}

.glow img.tribe {
  mask: var(--mask) center / contain no-repeat luminance;
}

.area.dim {
  opacity: 0.3;
}

.maps-enter-active, .maps-leave-active {
  transition: opacity 0.3s ease;
}

.maps-enter-from, .maps-leave-to {
  opacity: 0;
}

.picks {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  max-width: 900px;
}

.pick {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 22px 20px 20px;
}

.glyph {
  --h: 42px;
  display: flex;
  align-items: center;
  gap: calc(var(--h) * 0.2);
  height: var(--h);
  margin: 0 0 14px;
  color: var(--text);
  transition: color 0.2s ease;
}

.glyph i, .glyph .plus {
  height: 100%;
}

.glyph i {
  background: currentColor;
  mask: var(--glyph) center / contain no-repeat;
}

.glyph .one {
  --glyph: url(/glyphs/one.webp);
  aspect-ratio: 20 / 80;
}

.glyph .two {
  --glyph: url(/glyphs/two.webp);
  aspect-ratio: 48 / 80;
}

.glyph .custom {
  --glyph: url(/glyphs/custom.webp);
  aspect-ratio: 78 / 48;
}

.glyph .plus {
  aspect-ratio: 10 / 28;
}

.pick.selected .glyph, .pick.selected strong {
  color: var(--accent);
}

.pick strong {
  font-family: var(--font-condensed);
  font-weight: 400;
  font-size: 24px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text);
  transition: color 0.2s ease;
}

.pick span {
  font-size: 13px;
  font-weight: 400;
}

.pick small {
  margin: 10px 0 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.cta {
  margin-top: clamp(18px, 3vh, 30px);
}

.seed {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 470px;
  margin: clamp(22px, 4vh, 40px) 0 0;
}

.seed input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  font: inherit;
  font-size: 13px;
  color: var(--text);
  background: var(--field);
  border: 1px solid var(--border);
  outline: none;
}

.seed input:focus {
  border-color: var(--accent);
}

.seed input::placeholder {
  color: var(--muted);
}

.seed button {
  padding: 9px 16px;
  font-size: 13px;
}

.seed-error {
  flex-basis: 100%;
  margin: 0;
  font-size: 13px;
  color: var(--error);
}

@media (max-width: 1100px) {
  .picks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-height: 500px) {
  .maps {
    display: none;
  }

  .picks {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .pick {
    padding: 12px 14px;
  }

  .pick strong {
    font-size: 18px;
  }

  .pick span {
    display: none;
  }

  .pick small {
    margin: 4px 0 0;
  }

  .glyph {
    --h: 24px;
    margin: 0 0 8px;
  }
}

@media (max-width: 760px) {
  .maps {
    top: 64px;
    bottom: calc(100% - var(--fog-top, 28vh) + 16px);
    left: 36px;
    right: 36px;
  }

  .map-row {
    gap: 16px;
  }

  .picks {
    gap: 6px;
  }

  .pick {
    grid-template-columns: 26px minmax(0, 1fr);
    align-items: center;
    column-gap: 8px;
    row-gap: 2px;
    padding: 10px;
  }

  .pick strong {
    font-size: 15px;
    line-height: 1.1;
  }

  .pick span {
    display: none;
  }

  .pick small {
    grid-column: 2;
    margin: 0;
    font-size: 10px;
    letter-spacing: 0.1em;
  }

  .glyph {
    --h: 16px;
    grid-row: span 2;
    justify-content: center;
    margin: 0;
  }
}
</style>
