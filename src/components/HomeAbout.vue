<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue"
import { TRIBES } from "../lib/rules.js"
import { loadScores } from "../lib/stats.js"
import ArrowIcon from "./ArrowIcon.vue"

defineProps({ count: Number })
const emit = defineEmits(["play"])
// the play area masks in public/map at the fog edge's midpoint, both games together
const MAP_KM2 = 45
const TRIBE_COUNT = TRIBES.filter(tribe => tribe.tribe && tribe.tribe !== "neutral").length
const vista = ref(null)
const guesses = ref(null)
let observer = null

function loadNumbers() {
  loadScores().then(scores => {
    guesses.value = Object.values(scores).reduce((sum, entry) => sum + entry.count, 0)
  })
}

onMounted(() => {
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer.disconnect()
      loadNumbers()
    }
  })
  observer.observe(vista.value)
})

onBeforeUnmount(() => observer?.disconnect())

const SHOTS = [
  { image: "round", title: "Look around", text: "Every photosphere is a full 360 degree view taken in the game. Drag to turn and scroll to zoom in on the details: a landmark on the horizon, the buildings, the plants underfoot.", alt: "A Horizon Wayfinder round, looking around a photosphere of a forest" },
  { image: "guess", title: "Pin the map", text: "Open the map and drop a pin where you think you are. Zero Dawn and Forbidden West share one map, so a wrong guess can land in the wrong game entirely.", alt: "The Horizon Wayfinder guess map showing both Horizon Zero Dawn and Horizon Forbidden West" },
  { image: "result", title: "See how close you got", text: "A guess within 25 metres scores the full 5,000 points, and every metre further away costs you. The result shows how far off you were.", alt: "A Horizon Wayfinder round result scoring 4,310 points" },
  { image: "map", title: "Explore the World Map", text: "Every photosphere you find is added to the World Map. Open them again, see your closest guesses, and explore both maps in 3D with all their icons.", alt: "The Horizon Wayfinder World Map of Horizon Forbidden West with its map icons" }
]
</script>

<template>
  <div class="about">
    <section class="intro">
      <p class="eyebrow">About</p>
      <h2 class="about-title"><span>Guess where</span><span class="outline">in Horizon</span></h2>
      <p class="lede">Horizon Wayfinder is a location guessing game for Horizon Zero Dawn and Horizon Forbidden West. Each round drops you somewhere in the world as a photosphere. Look around, work out where you are, and pin it on the map. The closer you get, the more you score.</p>
    </section>
    <section v-for="(shot, n) in SHOTS" :key="shot.image" class="shot" :class="{ flipped: n % 2 }">
      <img :src="`/about/${shot.image}.avif`" :alt="shot.alt" width="1600" height="900" loading="lazy" decoding="async">
      <div>
        <em>{{ String(n + 1).padStart(2, "0") }}</em>
        <h3>{{ shot.title }}</h3>
        <p>{{ shot.text }}</p>
      </div>
    </section>
    <section ref="vista" class="vista">
      <img src="/backgrounds/2561580_20241111232818.avif" alt="Sunlight through a birch forest in Horizon Forbidden West" width="1920" height="1080" loading="lazy" decoding="async">
      <div class="vista-content">
        <p class="eyebrow">Your turn</p>
        <h2 class="about-title"><span>Are you ready</span><span class="outline">to play?</span></h2>
        <p class="lede">Two games, one map. See how well you really know the world.</p>
        <div class="stat-row numbers">
          <div class="stat-block"><small class="label">Photospheres</small><strong>{{ count ? count.toLocaleString("en") : "-" }}</strong></div>
          <div class="stat-block"><small class="label">Map area</small><strong>{{ MAP_KM2 }} <span class="unit">km²</span></strong></div>
          <div class="stat-block"><small class="label">Tribes</small><strong>{{ TRIBE_COUNT }}</strong></div>
          <div class="stat-block"><small class="label">Guesses made</small><strong>{{ guesses === null ? "-" : guesses.toLocaleString("en") }}</strong></div>
        </div>
        <div class="button-row">
          <button class="action" type="button" @click="emit('play')">Play<ArrowIcon /></button>
        </div>
      </div>
    </section>
    <section class="points">
      <div>
        <h3>Pick your rules</h3>
        <p>Easy, Normal and Hard, or set your own. Turn off looking around, zooming, the compass or the map icons, and choose which areas and tribes come up.</p>
      </div>
      <div>
        <h3>Challenge a friend</h3>
        <p>Every game has a link. Send it to someone and they play the same photospheres, with your score to beat.</p>
      </div>
      <div>
        <h3>Both games</h3>
        <p>Horizon Zero Dawn and Horizon Forbidden West, as well as both of their DLCs. There are currently {{ count || "hundreds of" }} photospheres between the games, with more on the way.</p>
      </div>
    </section>
    <section class="made">
      <p class="eyebrow">Made with Photosphere</p>
      <p>Every photosphere is captured in game with Photosphere, a mod for Horizon Forbidden West and Horizon Zero Dawn Remastered.</p>
      <div class="button-row bright">
        <a class="button secondary" href="https://www.nexusmods.com/horizonforbiddenwest/mods/226" target="_blank" rel="noopener">Horizon Forbidden West</a>
        <a class="button secondary" href="https://www.nexusmods.com/horizonzerodawnremastered/mods/57" target="_blank" rel="noopener">Horizon Zero Dawn Remastered</a>
      </div>
    </section>
    <footer class="site-footer">
      <div class="credit">
        <span class="mark"><i class="mark-emblem"></i>Horizon Wayfinder</span>
        <span>Made by <a href="https://ewanhowell.com" target="_blank" rel="noopener">Ewan Howell</a></span>
      </div>
      <p>Horizon Wayfinder is a fan made project. It is not affiliated with, endorsed or sponsored by Sony Interactive Entertainment or Guerrilla Games. Horizon Zero Dawn, Horizon Forbidden West and all related names and images belong to their respective owners.</p>
    </footer>
  </div>
</template>

<style scoped>
.about {
  display: grid;
  gap: clamp(64px, 10vh, 120px);
  margin: 0 -56px -34px;
  --fade-length: clamp(96px, 16vh, 180px);
  padding: calc(var(--fade-length) + clamp(64px, 10vh, 120px)) 56px 0;
  background: linear-gradient(rgba(7, 9, 12, 0.000) calc(var(--fade-length) * 0.000), rgba(7, 9, 12, 0.020) calc(var(--fade-length) * 0.083), rgba(7, 9, 12, 0.074) calc(var(--fade-length) * 0.167), rgba(7, 9, 12, 0.156) calc(var(--fade-length) * 0.250), rgba(7, 9, 12, 0.259) calc(var(--fade-length) * 0.333), rgba(7, 9, 12, 0.376) calc(var(--fade-length) * 0.417), rgba(7, 9, 12, 0.500) calc(var(--fade-length) * 0.500), rgba(7, 9, 12, 0.624) calc(var(--fade-length) * 0.583), rgba(7, 9, 12, 0.741) calc(var(--fade-length) * 0.667), rgba(7, 9, 12, 0.844) calc(var(--fade-length) * 0.750), rgba(7, 9, 12, 0.926) calc(var(--fade-length) * 0.833), rgba(7, 9, 12, 0.980) calc(var(--fade-length) * 0.917), rgba(7, 9, 12, 1.000) calc(var(--fade-length) * 1.000));
}

.intro, .shot, .points, .made, .site-footer {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}

.eyebrow {
  margin: 0 0 14px;
}

.about-title {
  margin: 0 0 24px;
  font-size: clamp(40px, 6vw, 84px);
}

.intro .lede {
  max-width: 640px;
  margin: 0;
}

.shot {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  align-items: center;
  gap: clamp(28px, 4vw, 64px);
}

.shot.flipped {
  grid-template-columns: 1fr 1.5fr;
}

.shot.flipped img {
  order: 1;
}

.shot img {
  display: block;
  width: 100%;
  height: auto;
  clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px));
}

.shot em {
  font-family: var(--font-condensed);
  font-style: normal;
  font-size: 28px;
  color: var(--accent);
}

h3 {
  margin: 6px 0 12px;
  font-family: var(--font-condensed);
  font-weight: 400;
  font-size: 34px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.shot p, .points p, .made p {
  margin: 0;
  font-size: 16px;
  line-height: 1.65;
  color: rgba(232, 234, 237, 0.8);
}

.vista {
  --edge: 280px;
  position: relative;
  display: grid;
  align-items: center;
  min-height: 100vh;
  margin: 0 -56px;
  padding: calc(var(--edge) * 0.7) 56px;
  clip-path: inset(0);
  mask-image: url(/about/edge-top.webp), linear-gradient(#000, #000), url(/about/edge-bottom.webp);
  mask-size: calc(var(--edge) * 500 / 280) var(--edge), 100% calc(100% - var(--edge) * 2 + 2px), calc(var(--edge) * 500 / 280) var(--edge);
  mask-position: top left, center, bottom left;
  mask-repeat: repeat-x, no-repeat, repeat-x;
}

.vista img {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vista::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(7, 9, 12, 0.8), rgba(7, 9, 12, 0) 62%);
}

.vista-content {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: start;
  gap: 28px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}

.vista-content .eyebrow, .vista-content .about-title, .vista-content .lede {
  margin: 0;
}

.numbers {
  flex-wrap: wrap;
  row-gap: 18px;
}

.unit {
  font-family: "Oita Norm", sans-serif;
  font-size: 0.6em;
  letter-spacing: 0.02em;
}

.vista .button-row {
  width: fit-content;
}

.points {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}

.points div {
  padding: 28px 28px 0 0;
}

.points div + div {
  padding-left: 28px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.points h3 {
  font-size: 26px;
}

.made {
  display: grid;
  justify-items: start;
  gap: 18px;
  max-width: 640px;
  margin: 0 auto 0 max(0px, (100% - 1180px) / 2);
}

.made .eyebrow {
  margin: 0;
}

.made .button-row {
  width: fit-content;
}

.site-footer {
  display: grid;
  gap: 16px;
  padding: 28px 0 34px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 13px;
  color: var(--muted);
}

.credit {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px 24px;
}

.site-footer p {
  max-width: 820px;
  margin: 0;
  line-height: 1.6;
}

.site-footer a {
  color: var(--text);
}

.site-footer a:hover {
  color: var(--accent);
}

@media (max-width: 760px) {
  .about {
    margin: 0 -20px -24px;
    padding: calc(var(--fade-length) + 40px) 20px 0;
  }

  .shot, .shot.flipped, .points {
    grid-template-columns: 1fr;
  }

  .vista {
    --edge: 168px;
    min-height: 0;
    margin: 0 -20px;
    padding: calc(var(--edge) * 0.7) 20px;
  }

  .vista::after {
    background: rgba(7, 9, 12, 0.55);
  }

  .made .button-row {
    --step: 14px;
    --gap: 8px;
    grid-auto-flow: row;
    row-gap: 0;
    width: 100%;
  }

  .made .button-row > :first-child {
    padding-bottom: calc(var(--pad-y) + var(--step));
    clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, calc(100% - var(--step)) calc(100% - var(--step)), var(--step) calc(100% - var(--step)), 0 calc(100% - var(--step) * 2));
  }

  .made .button-row > :last-child {
    margin-top: calc(var(--step) * -2);
    padding-top: calc(var(--pad-y) + var(--step) + var(--gap));
    clip-path: polygon(0 calc(var(--gap) * 1.4142), calc(var(--step) - var(--gap) * 0.4142) calc(var(--step) + var(--gap)), calc(100% - var(--step) - var(--gap) * 0.4142) calc(var(--step) + var(--gap)), 100% calc(var(--step) * 2 + var(--gap) * 1.4142), 100% 100%, 16px 100%, 0 calc(100% - 16px));
  }

  .made .button-row > *::before {
    display: none;
  }

  .shot.flipped img {
    order: 0;
  }

  .points div, .points div + div {
    padding: 22px 0 0;
    border-left: 0;
  }
}
</style>
