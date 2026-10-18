<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import AtlasScreen from "./components/AtlasScreen.vue"
import LoadingEmblem from "./components/LoadingEmblem.vue"
import ChallengeScreen from "./components/ChallengeScreen.vue"
import GameHud from "./components/GameHud.vue"
import GuessPanel from "./components/GuessPanel.vue"
import HomeScreen from "./components/HomeScreen.vue"
import MapView from "./components/MapView.vue"
import PhotoSphere from "./components/PhotoSphere.vue"
import ScoreReveal from "./components/ScoreReveal.vue"
import RoundIntro from "./components/RoundIntro.vue"
import SlideBackdrop from "./components/SlideBackdrop.vue"
import GamesScreen from "./components/GamesScreen.vue"
import SetupScreen from "./components/SetupScreen.vue"
import FinalResults from "./components/FinalResults.vue"
import { MAX_POINTS, ROUNDS, distanceLabel, formatDistance, points, readStore, shuffle, wait, writeStore } from "./lib/game.js"
import { cauldronFor, loadCard } from "./lib/cauldrons.js"
import { answerMarker, devMarker, pin } from "./lib/markers.js"
import { pointLocation } from "./lib/locations.js"
import { decodePosition } from "./lib/position.js"
import { LOCATIONS, MODE_RULES, TRIBES, fullRules, gamesOf, modeOf, offTribes, SHARED_TRIBES, tribeOn, tribeOrder, tribeRules, tribesOf, wholeGames, withGames } from "./lib/rules.js"
import { loadGuesses, loadScores, recordGuess, scoreColour } from "./lib/stats.js"
import { loadTribes, tribeAt } from "./lib/tribes.js"
import { decodeScore, decodeSeed, encodeSeed, randomCode, seededRandom, seedLink } from "./lib/seed.js"
import { pickView } from "./lib/view.js"

const COUNTDOWN = 3
const SEPARATE_PIECE = "hfw-east"
// after RoundIntro's per tick ring step (0.45 s) and pulse (0.7 s) have finished
const QUIET_MS = 700
const MAP_DELAY_MS = 1200
const SWAP_FADE_MS = 200
const SCREEN_PATHS = { home: "", games: "play", setup: "setup", challenge: "challenge", game: "game", atlas: "map" }
const FOUND = "found"
const RECENT = "recentRounds"
const RECENT_GAMES = 2
const BEST_GUESSES = "bestGuesses"
const MISSED = { "Wrong game": "You guessed the wrong game", "Too far away": "Your guess was too far away" }
const ATLAS_RADIUS_METRES = 400
const MAP_READY_TIMEOUT_MS = 10000
// the .bigmap opacity transition
const MAP_FADE_MS = 450
// --tuck in GuessPanel.vue
const MINIMAP_TUCK = 40 - 8 * Math.SQRT2
const MINIMAP_PAD = 6
const MINIMAP_MARGIN = 1.04
// the .marker.atlas opacity transition in styles.css
const PIN_FADE_MS = 400
const REVEAL_COUNT_DELAY_MS = 1000
const REVEAL_COUNT_MS = 1600
const REVEAL_DOCK_MS = 3000
const SAVED_GAME = "savedGame"
const GAME_SUFFIXES = { both: "", hzd: "ZeroDawn", hfw: "ForbiddenWest" }
const GAME_TITLES = { hzd: "Horizon Zero Dawn Remastered", hfw: "Horizon Forbidden West" }
const COMBINATIONS = ["easy", "normal", "hard"].flatMap(modeName => Object.keys(GAME_SUFFIXES).map(which => [modeName, which]))
const TIPS = [
  "Hover the map in the corner to open it. The button in its corner makes it bigger.",
  "Right drag pans the map without moving your pin.",
  "Click your pin again to take it back.",
  "Space or Enter locks in your guess.",
  "Look for landmarks on the skyline: ruins, mountains and machine sites."
]
const COMPASS_TIP = "The compass at the top shows which way you are facing."
const PAN_TIP = "Drag to look around."
const ZOOM_TIP = "Scroll or pinch to zoom in on far off details."
const LOCKED_TIP = "The view is locked. Everything you get is already in frame."

const phase = ref("menu")
const mode = ref(["easy", "hard", "custom"].includes(readStore("mode")) ? readStore("mode") : "normal")
const customRules = ref(fullRules(readJson("customRules")))
const tribeFilter = ref(readStore("tribeFilter") === "true")
const games = ref("both")
const intro = ref(false)
const setup = ref(false)
const choosing = ref(false)
const atlas = ref(false)
const found = ref(new Set(readJson(FOUND) || []))
const bestGuesses = ref(readJson(BEST_GUESSES) || {})
const swapped = ref(false)
const restoring = ref(false)
const swapFading = ref(false)
const pool = ref([])
const mapsReady = ref(false)
let mapsLoading = null
let poolLoading = null
const best = ref(null)
const last = ref(null)
const average = ref(null)
const overall = ref(null)
const heading = ref(0)
const hasGuess = ref(false)
const status = reactive({ index: 1, count: ROUNDS, total: 0, progress: 0, label: "", tip: "", countdown: COUNTDOWN, waiting: false, held: false })
const result = ref(null)
const summary = ref(null)
const seedInput = ref(new URLSearchParams(location.search).get("seed") || "")
const seedError = ref("")
const challenge = ref(readChallenge(location.search))
const viewing = ref(null)
const viewStats = ref(null)
const devSelected = ref(null)
if (seedInput.value && !challenge.value) {
  seedError.value = "That seed doesn't look right. Check it was copied in full."
}

const sphere = ref(null)
const backdrop = ref(null)
const minimap = ref(null)
const bigmap = ref(null)
const resultCard = ref(null)
const finalResults = ref(null)

const isMenu = computed(() => phase.value === "menu")
const isRound = computed(() => phase.value === "round")
const homeShown = computed(() => isMenu.value && !challenge.value && !setup.value && !choosing.value && !atlas.value && !restoring.value)
const markLabel = computed(() => !isMenu.value || restoring.value || viewing.value ? null : homeShown.value ? "Photosphere guessing game" : "Horizon Wayfinder")
const showsMap = computed(() => (phase.value === "result" || phase.value === "summary" || atlas.value) && !viewing.value)
const devMode = ref(readStore("devMode") === "1")
const foundRounds = computed(() => pool.value.filter(round => found.value.has(round.name)))
const atlasRounds = computed(() => mapTab.value === "dev" ? pool.value : foundRounds.value)
const playing = computed(() => isRound.value && !intro.value)
const swapView = computed(() => swapped.value && playing.value)
const sphereActive = computed(() => playing.value || Boolean(viewing.value && !viewing.value.loading))
const choices = computed(() => pool.value.filter(round => rules.value[round.location] && tribeOn(rules.value, round.tribe)))
const tribeCounts = computed(() => Object.fromEntries(TRIBES.map(tribe => [tribe.id, pool.value.filter(round => rules.value[round.location] && tribeRules(round.tribe).includes(tribe.id)).length])))
const counts = computed(() => ({ both: pool.value.length, hzd: pool.value.filter(round => round.game === "hzd").length, hfw: pool.value.filter(round => round.game === "hfw").length }))
const locationCounts = computed(() => Object.fromEntries(LOCATIONS.map(location => [location.id, pool.value.filter(round => round.location === location.id).length])))
const roundCount = computed(() => Math.min(ROUNDS, choices.value.length))
const canPlay = computed(() => pool.value.length > 0)
const rules = computed(() => customLocations(mode.value === "custom" ? customRules.value : MODE_RULES[mode.value]))
const scored = computed(() => modeOf(rules.value) !== "custom")
const litAreas = computed(() => LOCATIONS.filter(location => rules.value[location.id]).map(location => location.id))
const tribeAreas = ref(null)
const tribeFrames = ref(null)
const availableTribes = computed(() => {
  const on = LOCATIONS.filter(location => customRules.value[location.id])
  if (!tribeAreas.value) {
    return tribeOrder(tribesOf(gamesOf(customRules.value)).filter(tribe => tribe.tribe))
  }
  return tribeOrder(TRIBES.filter(tribe => on.some(location => tribeAreas.value[location.game]?.[location.id]?.some(present => tribeRules(present).includes(tribe.id)))))
})
const litTribes = computed(() => TRIBES.filter(tribe => tribe.tribe && tribeOn(rules.value, tribe.tribe)).map(tribe => tribe.tribe).concat(Object.keys(SHARED_TRIBES).filter(tribe => tribeOn(rules.value, tribe))))
const chosenGames = computed(() => games.value === "custom" && choices.value.length && wholeGames(rules.value) && !offTribes(rules.value).length ? gamesOf(rules.value) : games.value)
const previewGame = computed(() => isMenu.value && choosing.value && !challenge.value ? gamesOf(rules.value) : null)
refreshScores()
const gameRules = ref(MODE_RULES.normal)
const gameMode = computed(() => modeOf(gameRules.value))

let game = null
let world = null
let tribeMaps = null
let guessMarker = null
let scoreReveal = null
let resultMarkers = []
let presentedRound = -1
let presentedAtlas = null
let viewToken = 0
let trail = []
let paused = null
let introRunning = false
let beginRound = null
let atlasMarkers = []
let atlasFramed = false
let atlasLeaving = null
const atlasMap = ref(false)
const mapTab = ref(readStore("mapTab") === "photospheres" || readStore("mapTab") === "dev" && devMode.value ? readStore("mapTab") : "map")
const atlasReady = ref(false)
const mapWaiting = ref(false)
const loadingKey = ref(0)

function readJson(key) {
  try {
    return JSON.parse(readStore(key))
  } catch {
    return null
  }
}

function readChallenge(input) {
  const seed = decodeSeed(input)
  return seed ? { seed, score: decodeScore(input, seed.rounds.length * MAX_POINTS) } : null
}

function openChallenge(input) {
  const found = readChallenge(input)
  if (!found) {
    seedError.value = "That seed doesn't look right. Check it was copied in full."
    return
  }
  seedError.value = ""
  enter("challenge", seedLink(found.seed.code, found.score))
  show("challenge")
}

function markClick(event) {
  if (!homeShown.value) {
    event.preventDefault()
    goHome()
  }
}

function goHome() {
  leaveTo("home")
}

function screenUrl(screen) {
  return import.meta.env.BASE_URL + SCREEN_PATHS[screen]
}

function screenFromPath() {
  const path = location.pathname.slice(import.meta.env.BASE_URL.length).replace(/\/$/, "")
  return Object.keys(SCREEN_PATHS).find(screen => SCREEN_PATHS[screen] === path) || "home"
}

function goGames() {
  setGames("both")
  enter("games")
  show("games")
}

function goAtlas() {
  enter("atlas")
  show("atlas")
}

function rememberRecent(rounds) {
  const recent = (readJson(RECENT) || []).filter(name => !rounds.some(round => round.name === name))
  writeStore(RECENT, JSON.stringify(rounds.map(round => round.name).concat(recent).slice(0, ROUNDS * RECENT_GAMES)))
}

function pickRounds(available) {
  const recent = new Set(readJson(RECENT) || [])
  const tier = round => !found.value.has(round.name) ? 0 : recent.has(round.name) ? 2 : 1
  return shuffle(shuffle(available).sort((a, b) => tier(a) - tier(b)).slice(0, ROUNDS))
}

function addFound(name) {
  if (found.value.has(name)) {
    return
  }
  found.value = new Set(found.value).add(name)
  writeStore(FOUND, JSON.stringify(Array.from(found.value)))
}

function setMapTab(tab) {
  mapTab.value = tab
  if (tab !== "dev") {
    setDevParam(null)
  }
  writeStore("mapTab", tab)
}

function applyMapTab() {
  const map = atlasMap.value && mapTab.value === "map"
  bigmap.value?.setFeatures({ modes: map, readouts: map, compass: map, icons: map, instant: !atlasMap.value })
  bigmap.value?.setIconZoom(map)
}

function clearAtlas() {
  const leaving = atlasMarkers
  atlasMarkers = []
  leaving.forEach(({ element }) => element.classList.add("leaving"))
  setTimeout(() => leaving.forEach(({ marker }) => marker.remove()), PIN_FADE_MS)
  bigmap.value?.setReveal(null)
  devSelected.value = null
  bigmap.value?.setHeat(null)
}

function setDevParam(name) {
  const url = new URL(location.href)
  if (name) {
    url.searchParams.set("dev", name)
  } else {
    url.searchParams.delete("dev")
  }
  if (url.href !== location.href) {
    history.replaceState(history.state, "", url)
  }
}

function deselectDev() {
  devSelected.value = null
  setDevParam(null)
  atlasMarkers.forEach(({ element }) => element.classList.remove("selected", "dimmed"))
  bigmap.value.setHeat(null)
}

function selectDev(round, stats) {
  if (devSelected.value?.name === round.name) {
    deselectDev()
    return
  }
  setDevParam(round.name)
  devSelected.value = Object.assign({ name: round.name, title: LOCATIONS.find(location => location.id === round.location)?.name || "" }, stats || { count: 0 })
  atlasMarkers.forEach(({ element }) => {
    element.classList.toggle("selected", element.dataset.name === round.name)
    element.classList.toggle("dimmed", element.dataset.name !== round.name)
  })
  if (!stats) {
    bigmap.value.setHeat(null)
    return
  }
  loadGuesses(round.name).then(guesses => {
    if (devSelected.value?.name === round.name) {
      bigmap.value.setHeat(guesses.map(([game, x, y]) => bigmap.value.place(game, x, y)), pool.value.map(round => bigmap.value.place(round.game, round.x, round.y)))
    }
  }, error => console.warn(error))
}

async function drawAtlas() {
  loadMaps()
  await whenMounted(bigmap)
  await Promise.all([bigmap.value.load(), poolLoading])
  if (!atlas.value) {
    return
  }
  const tab = mapTab.value
  const scores = tab === "dev" ? await loadScores() : null
  if (!atlas.value || mapTab.value !== tab) {
    return
  }
  clearAtlas()
  bigmap.value.setLocations(null)
  applyMapTab()
  const photospheres = mapTab.value !== "map"
  const points = (photospheres ? atlasRounds.value : []).map(round => {
    const place = bigmap.value.place(round.game, round.x, round.y)
    const stats = scores?.[round.name]
    const element = scores ? devMarker(scoreColour(stats)) : answerMarker()
    element.classList.add("atlas")
    element.title = (LOCATIONS.find(location => location.id === round.location)?.name || "") + (scores ? `\n${statsLabel(stats)}` : "")
    element.dataset.name = round.name
    element.querySelector(".dot").addEventListener("click", () => scores ? selectDev(round, stats) : openView({ atlas: round.name }))
    atlasMarkers.push({ element, marker: bigmap.value.addMarker(element, place.x, place.y) })
    return { x: place.x, y: place.y }
  })
  const remembered = scores && atlasRounds.value.find(round => round.name === new URLSearchParams(location.search).get("dev"))
  if (remembered) {
    selectDev(remembered, scores[remembered.name])
  }
  const sites = pool.value.map(round => {
    const place = bigmap.value.place(round.game, round.x, round.y)
    return { x: place.x, y: place.y }
  })
  bigmap.value.setReveal(photospheres ? points : null, ATLAS_RADIUS_METRES / 256, sites, !atlasFramed)
  if (!atlasFramed) {
    atlasFramed = true
    bigmap.value.fit(null, { snap: true })
    await Promise.race([bigmap.value.whenReady(), wait(MAP_READY_TIMEOUT_MS)])
    atlasReady.value = atlas.value
  }
}

function showStats(name) {
  viewStats.value = null
  loadScores().then(scores => {
    if (viewing.value) {
      viewStats.value = scores[name] || null
    }
  })
}

function statsLabel(stats) {
  if (!stats) {
    return "No plays yet"
  }
  const plays = `${stats.count} ${stats.count === 1 ? "player" : "players"}`
  return `Difficulty ${stats.difficulty} / 10, average score ${stats.average.toLocaleString("en")}, average distance ${formatDistance(stats.distance)}, from ${plays}`
}

async function viewAtlas(round) {
  const token = ++viewToken
  showStats(round.name)
  const title = LOCATIONS.find(location => location.id === round.location)?.name || "This"
  sphere.value.setControls({ pan: true, zoom: true })
  const best = bestGuesses.value[round.name]
  const unfound = !found.value.has(round.name)
  if (presentedAtlas === round.name) {
    viewing.value = { title, best, unfound, loading: false }
    return
  }
  viewing.value = { title, best, unfound, loading: true }
  try {
    const bitmap = await sphere.value.decode(`/photospheres/${round.name}.avif`)
    if (token !== viewToken) {
      bitmap.close()
      return
    }
    sphere.value.present(sphere.value.upload(bitmap), 0, 0)
    presentedRound = -1
    presentedAtlas = round.name
    viewing.value = { title, best, unfound, loading: false }
  } catch (error) {
    console.warn(error)
    if (token === viewToken) {
      viewing.value = null
    }
  }
}

function goSetup() {
  enter("setup")
  show("setup")
}

function customLocations(base) {
  return games.value === "custom" ? Object.assign({}, base, Object.fromEntries(LOCATIONS.map(location => [location.id, customRules.value[location.id]]).concat(TRIBES.map(tribe => [tribe.id, !tribeFilter.value || customRules.value[tribe.id] || !availableTribes.value.includes(tribe)])))) : Object.assign(withGames(base, games.value), Object.fromEntries(TRIBES.map(tribe => [tribe.id, true])))
}

function currentDepth() {
  return history.state?.depth ?? 0
}

function mark(depth, screen) {
  trail = trail.slice(0, depth)
  trail[depth] = screen
}

function enter(screen, url = screenUrl(screen)) {
  const depth = currentDepth() + 1
  mark(depth, screen)
  history.pushState({ screen, depth }, "", url)
}

function replaceScreen(screen, url = screenUrl(screen)) {
  mark(currentDepth(), screen)
  history.replaceState({ screen, depth: currentDepth() }, "", url)
}

function leaveTo(screen) {
  const depth = currentDepth()
  const index = trail.lastIndexOf(screen, depth - 1)
  if (index >= 0) {
    history.go(index - depth)
    return
  }
  replaceScreen(screen)
  show(screen)
}

function show(screen) {
  if (screen === "game") {
    const params = gameParams()
    if (game && game.seed === params.seed && game.id === params.id) {
      resumeGame()
      return
    }
    const saved = savedGame(params)
    if (saved) {
      restoreGame(saved)
      return
    }
    replaceScreen("challenge", screenUrl("challenge") + location.search)
    show("challenge")
    return
  }
  pauseGame()
  seedError.value = ""
  challenge.value = screen === "challenge" ? readChallenge(location.search) : null
  if (screen === "challenge" && !challenge.value) {
    replaceScreen("home")
  }
  setup.value = screen === "setup"
  choosing.value = screen === "games"
  atlas.value = screen === "atlas"
}

function onHistory() {
  if (!history.state) {
    history.replaceState({ screen: screenFromPath(), depth: trail.length }, "", location.href)
  }
  const screen = history.state.screen
  mark(currentDepth(), screen)
  show(screen)
  if (history.state?.view) {
    showView(history.state.view)
  } else if (viewing.value) {
    closeView()
  }
}

function openView(view) {
  const screen = history.state.screen
  const depth = currentDepth() + 1
  mark(depth, screen)
  history.pushState({ screen, depth, view }, "", view.atlas ? `${screenUrl("atlas")}?view=${encodeURIComponent(view.atlas)}${location.hash}` : location.href)
  showView(view)
}

async function showView(view) {
  if (view.atlas) {
    viewing.value ??= { title: "", loading: true }
    await poolLoading
    const round = pool.value.find(entry => entry.name === view.atlas)
    if (round && atlas.value) {
      viewAtlas(round)
    } else if (viewing.value?.loading) {
      viewing.value = null
    }
  } else if (game && view.round < game.rounds.length) {
    viewRound(view.round)
  }
}

function leaveView() {
  if (history.state?.view) {
    history.back()
  } else {
    closeView()
  }
}

function playChallenge() {
  playSeed(challenge.value.seed.code)
}

function scoreKey(name, modeName = mode.value, which = gamesOf(rules.value)) {
  return `${name}${{ easy: "Easy", hard: "Hard" }[modeName] || ""}${GAME_SUFFIXES[which]}`
}

function refreshScores() {
  const scored = modeOf(rules.value) !== "custom"
  best.value = scored ? storedScore(scoreKey("bestScore")) : null
  last.value = scored ? storedScore(scoreKey("lastScore")) : null
  average.value = scored ? averageScore() : null
  overall.value = overallScores()
}

function overallScores() {
  const total = name => COMBINATIONS.reduce((sum, [modeName, which]) => sum + (storedScore(scoreKey(name, modeName, which)) || 0), 0)
  const bests = COMBINATIONS.map(([modeName, which]) => storedScore(scoreKey("bestScore", modeName, which))).filter(value => value !== null)
  const played = total("gamesPlayed")
  const lasts = COMBINATIONS.map(([modeName, which]) => storedScore(scoreKey("lastScore", modeName, which))).filter(value => value !== null)
  return { best: bests.length ? Math.max(...bests) : null, last: storedScore("lastScoreOverall") ?? lasts[0] ?? null, average: played ? Math.round(total("scoreSum") / played) : null }
}

function setMode(value) {
  mode.value = value
  writeStore("mode", value)
  refreshScores()
}

function setRule(id, value) {
  customRules.value = Object.assign({}, customRules.value, { [id]: value })
  writeStore("customRules", JSON.stringify(customRules.value))
  refreshScores()
}

function setTribeFilter(value) {
  tribeFilter.value = value
  writeStore("tribeFilter", String(value))
  refreshScores()
}

function setGames(value) {
  games.value = value
  refreshScores()
}

function averageScore() {
  const games = storedScore(scoreKey("gamesPlayed"))
  return games ? Math.round(storedScore(scoreKey("scoreSum")) / games) : null
}

function storedScore(key) {
  const value = readStore(key)
  return value === null || value === "" ? null : Number(value)
}

function setHeading(value) {
  heading.value = value
}

function clearMarkers() {
  stopReveal()
  guessMarker?.remove()
  guessMarker = null
  resultMarkers.forEach(marker => marker.remove())
  resultMarkers = []
  bigmap.value?.setLines([])
}

async function loadPool() {
  try {
    const response = await fetch("/photospheres/photospheres.json", { cache: "no-store" })
    if (response.ok) {
      world ??= await (await fetch("/map/world.json")).json()
      tribeMaps ??= await loadTribes().catch(error => {
        console.warn(error)
        return {}
      })
      tribeAreas.value = Object.fromEntries(Object.entries(tribeMaps).map(([key, map]) => [key, map.info.areas || {}]))
      tribeFrames.value = Object.fromEntries(Object.entries(tribeMaps).map(([key, map]) => [key, map.info.frame]))
      const entries = Object.entries(await response.json()).flatMap(([game, spheres]) => Object.entries(spheres).map(([name, text]) => ({ name, game, text })))
      pool.value = await Promise.all(entries.map(async ({ name, game, text }) => {
        const [x, y, z] = await decodePosition(name, text)
        return { name, game, x, y, z, location: pointLocation(world, game, x, y), tribe: tribeAt(tribeMaps, world, game, x, y) }
      }))
    }
  } catch (error) {
    console.warn(error)
  }
}

function preload(index) {
  const round = game?.rounds[index]
  if (round && !round.image) {
    round.progress = 0
    round.image = sphere.value.decode(`/photospheres/${round.name}.avif`, progress => round.progress = progress)
    round.image.then(bitmap => round.bitmap = bitmap, error => console.warn(error))
  }
}

function prepare(round, current) {
  if (round.prepared || !round.bitmap) {
    return
  }
  if (!round.view) {
    round.view = pickView(round.bitmap, seededRandom(round.code))
  }
  round.prepared = { texture: sphere.value.upload(round.bitmap), view: round.view }
  round.bitmap = null
}

function drop(round) {
  round.bitmap?.close()
  round.bitmap = null
  if (round.prepared) {
    sphere.value.discard(round.prepared.texture)
    round.prepared = null
  }
}

async function countDown(current, round) {
  for (let n = COUNTDOWN; n > 0; n--) {
    if (game !== current) {
      return
    }
    const tick = performance.now()
    status.countdown = n
    await wait(QUIET_MS)
    if (game !== current) {
      return
    }
    prepare(round, current)
    await wait(Math.max(1000 - (performance.now() - tick), 0))
  }
  if (game === current) {
    status.countdown = 0
  }
}

function showLocations(current) {
  const shown = LOCATIONS.filter(location => current.rules[location.id]).map(location => location.id)
  minimap.value.setLocations(shown)
  bigmap.value.setLocations(shown)
}

function whenMounted(...refs) {
  if (refs.every(item => item.value)) {
    return Promise.resolve()
  }
  return new Promise(resolve => {
    const stop = watch(refs, values => {
      if (values.every(Boolean)) {
        stop()
        resolve()
      }
    })
  })
}

function loadMaps() {
  mapsLoading ??= (async () => {
    await whenMounted(minimap, bigmap)
    const order = atlas.value ? [bigmap.value, minimap.value] : [minimap.value, bigmap.value]
    await order[0].load()
    await order[1].load()
    minimap.value.setBottomInset(swapView.value ? 0 : MINIMAP_TUCK)
    applyMapTab()
    mapsReady.value = true
  })()
  return mapsLoading
}

function startHeld() {
  beginRound?.()
}

async function startRound() {
  startHeld()
  const current = game
  const round = current.rounds[current.index]
  swapped.value = false
  swapFading.value = false
  prepare(round, current)
  clearMarkers()
  current.guess = null
  hasGuess.value = false
  status.index = current.index + 1
  loadCard(cauldronFor(status.index)).catch(error => console.warn(error))
  status.count = current.rounds.length
  status.total = current.total
  status.progress = 0
  status.label = "Loading photosphere"
  status.countdown = COUNTDOWN
  status.waiting = false
  const tips = TIPS.concat(current.rules.compass ? [COMPASS_TIP] : [], current.rules.pan ? [PAN_TIP] : [LOCKED_TIP], current.rules.zoom ? [ZOOM_TIP] : [])
  status.tip = tips[Math.floor(Math.random() * tips.length)]
  phase.value = "round"
  intro.value = true
  introRunning = true
  loadMaps().then(() => {
    minimap.value.setFeatures({ modes: current.rules.map3d, readouts: current.rules.readouts, compass: current.rules.compass, icons: current.rules.icons })
    showLocations(current)
    minimap.value.setMode(false, true)
    minimap.value.fit(null, { snap: true, game: current.games === "both" ? null : current.games, side: MINIMAP_PAD, margin: MINIMAP_MARGIN })
  })
  backdrop.value.cycle(false)
  backdrop.value.next(true).then(() => backdrop.value.prepare())
  preload(current.index)
  const ticker = setInterval(() => {
    status.progress = round.progress || 0
    status.label = status.progress < 1 ? `Loading photosphere ${Math.round(status.progress * 100)}%` : "Ready"
  }, 60)
  await countDown(current, round)
  if (!mapsReady.value && game === current) {
    status.waiting = true
    await loadMaps()
  }
  if (!round.prepared && !round.bitmap && game === current) {
    status.waiting = true
    try {
      await round.image
    } catch (error) {
      clearInterval(ticker)
      status.label = `Could not load ${round.name}: ${error.message}`
      return
    }
  }
  clearInterval(ticker)
  if (game === current && !document.hasFocus()) {
    status.held = true
    await new Promise(resolve => beginRound = resolve)
    beginRound = null
    status.held = false
  }
  if (game !== current) {
    drop(round)
    return
  }
  prepare(round, current)
  status.progress = 1
  status.label = "Ready"
  const revealed = sphere.value.present(round.prepared.texture, round.prepared.view.yaw, round.prepared.view.pitch)
  presentedRound = current.index
  presentedAtlas = null
  sphere.value.setControls({ pan: current.rules.pan, zoom: current.rules.zoom })
  round.prepared = null
  round.image = null
  introRunning = false
  intro.value = false
  const next = current.index + 1
  await revealed
  if (game === current) {
    preload(next)
  }
}

function removeGuess() {
  if (!game || game.state !== "round") {
    return
  }
  guessMarker?.remove()
  guessMarker = null
  game.guess = null
  hasGuess.value = false
  saveGame()
}

function saveGame() {
  try {
    sessionStorage.setItem(SAVED_GAME, JSON.stringify({
      id: game.id,
      seed: game.seed,
      rules: game.rules,
      games: game.games,
      index: game.index,
      total: game.total,
      state: game.state,
      results: game.results,
      guess: game.guess && { x: game.guess.x, y: game.guess.y },
      rounds: game.rounds.map(({ name, game: which, x, y, z, code }) => ({ name, game: which, x, y, z, code }))
    }))
  } catch {}
}

function gameParams() {
  const params = new URLSearchParams(location.search)
  return { seed: params.get("seed"), id: params.get("id") }
}

function savedGame({ seed, id }) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVED_GAME))
    return saved && saved.seed === seed && saved.id === id ? saved : null
  } catch {
    return null
  }
}

async function restoreGame(saved) {
  restoring.value = true
  paused = null
  challenge.value = null
  setup.value = false
  choosing.value = false
  game = { rounds: saved.rounds, index: saved.index, total: saved.total, results: saved.results, state: saved.state, guess: null, rules: fullRules(saved.rules), games: saved.games, seed: saved.seed, id: saved.id }
  gameRules.value = game.rules
  status.index = game.index + 1
  status.count = game.rounds.length
  status.total = game.total
  if (game.state === "round") {
    const current = game
    preload(current.index)
    startRound()
    restoring.value = false
    if (saved.guess) {
      await loadMaps()
      if (game === current && game.state === "round") {
        placeGuess({ x: saved.guess.x, y: saved.guess.y })
      }
    }
    return
  }
  backdrop.value.cycle(false)
  mapWaiting.value = true
  await loadMaps()
  showLocations(game)
  restoring.value = false
  const entries = game.state === "result" ? [game.results[game.index]] : game.results
  phase.value = game.state
  bigmap.value.fit(entries.flatMap(entry => [entry.guess, entry.answer]), { snap: true })
  await Promise.race([bigmap.value.whenReady(), wait(MAP_READY_TIMEOUT_MS)])
  mapWaiting.value = false
  if (game.state === "result") {
    await showResult(game.results[game.index], true)
  } else {
    await showSummary(false)
  }
}

function placeGuess(place) {
  if (!game || game.state !== "round") {
    return
  }
  game.guess = place
  if (guessMarker) {
    guessMarker.move(place.x, place.y)
  } else {
    const element = pin()
    element.classList.add("removable")
    element.title = "Click to remove"
    element.addEventListener("click", removeGuess)
    guessMarker = minimap.value.addMarker(element, place.x, place.y)
  }
  hasGuess.value = true
  saveGame()
}

async function submitGuess() {
  if (!game || game.state !== "round" || !game.guess) {
    return
  }
  const round = game.rounds[game.index]
  const answer = bigmap.value.place(round.game, round.x, round.y)
  const guess = { x: game.guess.x, y: game.guess.y }
  const spot = bigmap.value.locate(guess.x, guess.y)
  const miss = spot.layer.game !== round.game ? "Wrong game" : spot.layer.id !== answer.layer.id && (spot.layer.id === SEPARATE_PIECE || answer.layer.id === SEPARATE_PIECE) ? "Too far away" : null
  const metres = miss ? null : Math.hypot(spot.worldX - round.x, spot.worldY - round.y)
  const score = miss ? 0 : points(metres, round.game)
  game.total += score
  const entry = { guess, answer: { x: answer.x, y: answer.y }, metres, miss, score }
  game.results.push(entry)
  if (!found.value.has(round.name) && !devMode.value) {
    recordGuess(round.name, { score, game: spot.layer.game, x: Math.round(spot.worldX * 10) / 10, y: Math.round(spot.worldY * 10) / 10 })
  }
  addFound(round.name)
  const previous = bestGuesses.value[round.name]
  if (previous === undefined || (metres !== null && !(previous <= metres))) {
    bestGuesses.value = { ...bestGuesses.value, [round.name]: metres ?? miss }
    writeStore(BEST_GUESSES, JSON.stringify(bestGuesses.value))
  }
  game.state = "result"
  saveGame()
  await showResult(entry, true)
}

async function showResult(entry, animate = false) {
  stopReveal()
  status.total = game.total
  resultMarkers.push(bigmap.value.addMarker(pin(), entry.guess.x, entry.guess.y))
  bigmap.value.setLines([[entry.guess, entry.answer]])
  result.value = { key: game.index, card: cauldronFor(game.index + 1), score: entry.score, shown: animate ? 0 : entry.score, distance: distanceLabel(entry), miss: Boolean(entry.miss), lastRound: game.index + 1 >= game.rounds.length, docked: !animate, animate }
  phase.value = "result"
  await nextTick()
  const points = [entry.guess, entry.answer]
  const room = resultCard.value?.insets() || {}
  const start = { x: entry.guess.x, y: entry.guess.y, zoom: 0.35 }
  if (!animate) {
    resultMarkers.push(bigmap.value.addMarker(answerMarker(), entry.answer.x, entry.answer.y))
    bigmap.value.fit(points, Object.assign({ start }, room))
    return
  }
  bigmap.value.setLineProgress(0)
  bigmap.value.fit(points, Object.assign({ start, delay: REVEAL_COUNT_DELAY_MS, duration: REVEAL_COUNT_MS }, room))
  playReveal(entry, points, room)
}

function playReveal(entry, points, room) {
  const begin = performance.now()
  const current = { entry, points, room, frame: 0, answered: false }
  scoreReveal = current
  function tick(now) {
    if (scoreReveal !== current) {
      return
    }
    const t = Math.min(Math.max((now - begin - REVEAL_COUNT_DELAY_MS) / REVEAL_COUNT_MS, 0), 1)
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    result.value.shown = Math.round(entry.score * eased)
    bigmap.value.setLineProgress(eased)
    if (t >= 1) {
      revealAnswer(current)
    }
    if (now - begin >= REVEAL_DOCK_MS) {
      finishReveal(false)
      return
    }
    current.frame = requestAnimationFrame(tick)
  }
  current.frame = requestAnimationFrame(tick)
}

function revealAnswer(current) {
  if (current.answered) {
    return
  }
  current.answered = true
  const answer = answerMarker()
  answer.classList.add("drop-in")
  resultMarkers.push(bigmap.value.addMarker(answer, current.entry.answer.x, current.entry.answer.y))
}

function finishReveal(skipped) {
  const current = scoreReveal
  if (!current) {
    return
  }
  stopReveal()
  revealAnswer(current)
  result.value.shown = current.entry.score
  result.value.docked = true
  bigmap.value.setLineProgress(1)
  if (skipped) {
    bigmap.value.fit(current.points, current.room)
  }
}

function stopReveal() {
  if (scoreReveal) {
    cancelAnimationFrame(scoreReveal.frame)
    scoreReveal = null
  }
}

async function showSummary(record = true) {
  game.state = "summary"
  saveGame()
  clearMarkers()
  const last = game.results.length - 1
  game.results.forEach((entry, n) => {
    const guess = pin(), answer = answerMarker(n + 1)
    if (n < last) {
      guess.classList.add("fade-in")
      answer.classList.add("fade-in")
    }
    resultMarkers.push(bigmap.value.addMarker(guess, entry.guess.x, entry.guess.y), bigmap.value.addMarker(answer, entry.answer.x, entry.answer.y))
  })
  bigmap.value.setLines(game.results.map(entry => [entry.guess, entry.answer]), game.results.map((_, n) => n < last ? "fade-in" : null))
  if (record && modeOf(game.rules) !== "custom") {
    const key = name => scoreKey(name, modeOf(game.rules), game.games)
    writeStore(key("lastScore"), game.total)
    writeStore("lastScoreOverall", game.total)
    if (game.total > (storedScore(key("bestScore")) || 0)) {
      writeStore(key("bestScore"), game.total)
    }
    writeStore(key("gamesPlayed"), (storedScore(key("gamesPlayed")) || 0) + 1)
    writeStore(key("scoreSum"), (storedScore(key("scoreSum")) || 0) + game.total)
    refreshScores()
  }
  summary.value = { seed: game.seed, total: game.total, max: game.rounds.length * MAX_POINTS, results: game.results.map(entry => ({ distance: distanceLabel(entry), score: entry.score })), animate: true }
  phase.value = "summary"
  await nextTick()
  bigmap.value.fit(game.results.flatMap(entry => [entry.guess, entry.answer]), finalResults.value?.room() || {})
}

function next() {
  if (!game || game.state !== "result") {
    return
  }
  if (history.state?.view) {
    history.replaceState({ screen: history.state.screen, depth: currentDepth() }, "", location.href)
  }
  closeView()
  if (game.index + 1 < game.rounds.length) {
    game.index++
    game.state = "round"
    game.guess = null
    saveGame()
    startRound()
    return
  }
  showSummary()
}

async function viewRound(index) {
  if (!game) {
    return
  }
  const token = ++viewToken
  const round = game.rounds[index]
  const title = `Round ${index + 1}`
  showStats(round.name)
  sphere.value.setControls({ pan: true, zoom: true })
  if (presentedRound === index) {
    viewing.value = { title, loading: false }
    return
  }
  viewing.value = { title, loading: true }
  try {
    const bitmap = await sphere.value.decode(`/photospheres/${round.name}.avif`)
    if (token !== viewToken) {
      bitmap.close()
      return
    }
    sphere.value.present(sphere.value.upload(bitmap), round.view?.yaw || 0, round.view?.pitch || 0)
    presentedRound = index
    presentedAtlas = null
    viewing.value = { title, loading: false }
  } catch (error) {
    console.warn(error)
    if (token === viewToken) {
      viewing.value = null
    }
  }
}

function viewResult() {
  openView({ round: game.index })
}

function closeView() {
  viewToken++
  viewing.value = null
}

function pauseGame() {
  if (!game || phase.value === "menu") {
    return
  }
  paused = { phase: phase.value }
  closeView()
  phase.value = "menu"
  intro.value = false
  loadPool()
  backdrop.value.next()
  backdrop.value.cycle(true)
}

function resumeGame() {
  if (!paused) {
    return
  }
  seedError.value = ""
  challenge.value = null
  setup.value = false
  choosing.value = false
  phase.value = paused.phase
  intro.value = introRunning
  paused = null
  backdrop.value.cycle(false)
}

function begin(rounds, gameRulesValue) {
  seedError.value = ""
  closeView()
  paused = null
  game = { rounds, index: 0, total: 0, results: [], state: "round", guess: null, rules: fullRules(gameRulesValue), games: gamesOf(fullRules(gameRulesValue)) }
  rememberRecent(rounds)
  game.seed = encodeSeed(game)
  game.id = Math.random().toString(36).slice(2, 8)
  const url = `${screenUrl("game")}?seed=${game.seed}&id=${game.id}`
  if (history.state?.screen === "game") {
    replaceScreen("game", url)
  } else {
    enter("game", url)
  }
  challenge.value = null
  setup.value = false
  choosing.value = false
  gameRules.value = game.rules
  saveGame()
  preload(0)
  startRound()
}

async function newGame() {
  await loadPool()
  if (!choices.value.length) {
    return
  }
  begin(pickRounds(choices.value).map(round => Object.assign({}, round, { code: randomCode() })), rules.value)
}

async function playSeed(input) {
  const seed = decodeSeed(input)
  if (!seed) {
    seedError.value = "That seed doesn't look right. Check it was copied in full."
    return
  }
  await loadPool()
  const byName = new Map(pool.value.map(round => [round.name, round]))
  const missing = seed.rounds.filter(round => !byName.has(round.name))
  if (missing.length) {
    seedError.value = missing.length === seed.rounds.length ? "None of this seed's photospheres are available any more." : `${missing.length} of this seed's photospheres ${missing.length === 1 ? "is" : "are"} no longer available.`
    return
  }
  begin(seed.rounds.map(round => Object.assign({}, byName.get(round.name), { code: round.code })), seed.rules)
}

async function toggleSwap() {
  if (swapFading.value) {
    return
  }
  swapFading.value = true
  await wait(SWAP_FADE_MS)
  swapped.value = !swapped.value
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  swapFading.value = false
}

function onKey(event) {
  if (viewing.value) {
    if (event.key === "Escape") {
      leaveView()
    }
    return
  }
  if (isMenu.value && !challenge.value && event.key === "Escape" && (setup.value || choosing.value || atlas.value)) {
    leaveTo(setup.value ? "games" : "home")
    return
  }
  if (isMenu.value || (event.key !== " " && event.key !== "Enter")) {
    return
  }
  if (beginRound) {
    event.preventDefault()
    startHeld()
  } else if (game?.state === "round" && game.guess) {
    event.preventDefault()
    submitGuess()
  } else if (game?.state === "result") {
    event.preventDefault()
    if (scoreReveal) {
      finishReveal(true)
    } else {
      next()
    }
  }
}

onMounted(async () => {
  window.addEventListener("keydown", onKey)
  window.addEventListener("popstate", onHistory)
  let sharedView = null
  const resumable = screenFromPath() === "game" && savedGame(gameParams())
  if (resumable) {
    replaceScreen("game", location.href)
    challenge.value = null
    restoring.value = true
  } else if (challenge.value) {
    replaceScreen("challenge", screenUrl("challenge") + location.search)
  } else {
    const path = screenFromPath()
    sharedView = path === "atlas" ? new URLSearchParams(location.search).get("view") : null
    const devPick = path === "atlas" && devMode.value ? new URLSearchParams(location.search).get("dev") : null
    if (sharedView) {
      mapTab.value = "photospheres"
    } else if (devPick) {
      mapTab.value = "dev"
    }
    replaceScreen(["games", "atlas"].includes(path) ? path : ["setup", "game", "challenge"].includes(path) ? "games" : "home", ["games", "atlas"].includes(path) ? screenUrl(path) + (devPick ? `?dev=${encodeURIComponent(devPick)}` : "") + location.hash : undefined)
  }
  setup.value = history.state.screen === "setup"
  choosing.value = history.state.screen === "games"
  atlas.value = history.state.screen === "atlas"
  poolLoading = loadPool()
  if (sharedView) {
    openView({ atlas: sharedView })
  }
  if (!previewGame.value && !resumable) {
    backdrop.value.next()
    backdrop.value.cycle(true)
  }
  backdrop.value.preload(3)
  await backdrop.value.ready.catch(error => console.warn(error))
  if (resumable) {
    restoreGame(resumable)
  }
  await wait(MAP_DELAY_MS)
  loadMaps()
})

watch(swapView, swapped => minimap.value?.setBottomInset(swapped ? 0 : MINIMAP_TUCK))

window.toggleSecretDevMode = () => {
  devMode.value = !devMode.value
  writeStore("devMode", devMode.value ? "1" : "")
  if (!devMode.value && mapTab.value === "dev") {
    setMapTab("map")
  }
  return devMode.value ? "Dev mode on" : "Dev mode off"
}

watch(() => Boolean(viewing.value?.loading || (atlas.value && !atlasReady.value) || mapWaiting.value), shown => {
  if (shown) {
    loadingKey.value++
  }
})

watch(mapTab, () => {
  if (atlas.value) {
    drawAtlas()
  }
})

watch([atlas, atlasRounds], () => {
  clearTimeout(atlasLeaving)
  if (atlas.value) {
    atlasMap.value = true
    drawAtlas()
  } else {
    atlasFramed = false
    atlasReady.value = false
    atlasLeaving = setTimeout(() => {
      atlasMap.value = false
      clearAtlas()
      applyMapTab()
    }, MAP_FADE_MS)
  }
})

watch(previewGame, (value, old) => {
  if (value) {
    backdrop.value.useMaps((value === "both" ? ["hzd", "hfw"] : [value]).map(game => ({ game, title: GAME_TITLES[game] })), !old)
    if (!old) {
      backdrop.value.cycle(true)
    }
  } else if (old) {
    backdrop.value.useScreenshots()
    if (isMenu.value) {
      backdrop.value.next()
      backdrop.value.cycle(true)
    }
  }
}, { flush: "sync" })

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey)
  window.removeEventListener("popstate", onHistory)
})
</script>

<template>
  <Teleport to="#sphere-box" defer :disabled="!swapView">
    <PhotoSphere ref="sphere" :active="sphereActive" :boxed="swapView" :faded="swapFading" @heading="setHeading" />
  </Teleport>
  <div id="map-full" class="map-full" :class="{ shown: swapView }"></div>
  <GameHud :round="status.index" :count="status.count" :score="status.total" :heading="heading" :hidden="!isRound" :mode="gameMode" :compass="gameRules.compass" :swapped="swapView" :faded="swapFading" />
  <GuessPanel :hidden="!isRound" :has-guess="hasGuess" :swapped="swapView" @guess="submitGuess" @swap="toggleSwap">
    <Teleport to="#map-full" defer :disabled="!swapView">
      <MapView ref="minimap" pickable pois scale modes :faded="swapFading" @pick="placeGuess" />
    </Teleport>
  </GuessPanel>
  <div class="bigmap" :class="{ shown: showsMap, waiting: (atlas && !atlasReady) || mapWaiting, atlas: atlasMap }">
    <MapView ref="bigmap" pois scale modes />
    <LoadingEmblem :key="loadingKey" class="map-loading" />
  </div>
  <div class="view-loading" :class="{ shown: viewing?.loading }">
    <LoadingEmblem :key="loadingKey" />
  </div>
  <Transition name="card">
    <ScoreReveal v-if="phase === `result` && result" ref="resultCard" :class="{ held: mapWaiting }" :key="result.key" :card="result.card" :score="result.shown" :distance="result.distance" :miss="result.miss" :last-round="result.lastRound" :docked="result.docked" :animate="result.animate" :viewing="Boolean(viewing)" @next="next" @view="viewResult" @back="leaveView" />
  </Transition>
  <Transition name="card">
    <FinalResults v-if="phase === `summary` && summary && !viewing" ref="finalResults" :class="{ held: mapWaiting }" :results="summary.results" :total="summary.total" :max="summary.max" :mode="gameMode" :seed="summary.seed" :animate="summary.animate" @menu="goHome" @again="newGame" @view="index => { summary.animate = false; openView({ round: index }) }" />
  </Transition>
  <Transition name="card">
    <div v-if="viewing && !viewing.loading && (phase !== `result` || atlas)" class="panel viewing">
      <span>{{ viewing.title }} photosphere</span>
      <span v-if="viewing.unfound" class="viewing-best">You haven't found this one yet</span>
      <span v-else-if="typeof viewing.best === `number`" class="viewing-best">Your closest guess <strong>{{ formatDistance(viewing.best) }}</strong></span>
      <span v-else-if="viewing.best" class="viewing-best">{{ MISSED[viewing.best] }}</span>
      <span v-if="viewStats" class="viewing-best" :title="statsLabel(viewStats)">Average difficulty <strong>{{ viewStats.difficulty }}</strong> / 10</span>
      <button class="secondary" type="button" @click="leaveView">{{ atlas ? "Back to the map" : "Back to results" }}</button>
    </div>
  </Transition>
  <div class="menu-mark" :class="{ shown: Boolean(markLabel) }">
    <a class="mark" :href="homeShown ? null : '/'" :title="homeShown ? null : 'Main menu'" @click.exact="markClick"><i class="mark-emblem"></i><Transition name="mark" mode="out-in"><span v-if="markLabel" :key="markLabel" class="mark-text">{{ markLabel }}</span></Transition></a>
  </div>
  <SlideBackdrop ref="backdrop" :active="((isMenu && !atlas) || intro) && !restoring" :timer="isMenu && !atlas && !restoring" :caption="!choosing" />
  <AtlasScreen :visible="isMenu && atlas && !viewing" :ready="atlasReady" :found="foundRounds.length" :total="pool.length" :dev="devMode" :selected="devSelected" :tab="mapTab" @tab="setMapTab" @view="openView({ atlas: devSelected.name })" />
  <ChallengeScreen :visible="isMenu && Boolean(challenge)" :ready="canPlay" :rules="challenge?.seed.rules" :games="challenge?.seed.games" :rounds="challenge?.seed.rounds.length || 0" :score="challenge?.score" :error="seedError" @play="playChallenge" />
  <HomeScreen :visible="homeShown" :count="pool.length" :found="found.size" :ready="canPlay" :best="overall.best" :last="overall.last" :average="overall.average" @play="goGames" @atlas="goAtlas" />
  <GamesScreen :visible="isMenu && !challenge && choosing" :ready="canPlay" :counts="counts" :location-counts="locationCounts" :available="choices.length" :games="games" :preview="previewGame" :lit="litAreas" :lit-tribes="litTribes" :tribe-areas="tribeAreas" :frames="tribeFrames" :tribes="availableTribes" :tribe-filter="tribeFilter" :tribe-counts="tribeCounts" :matched="chosenGames !== 'custom'" :custom-rules="customRules" :seed="seedInput" :seed-error="seedError" @games="setGames" @rule="setRule" @tribe-filter="setTribeFilter" @next="goSetup" @seed="openChallenge" />
  <SetupScreen :visible="isMenu && !challenge && setup" :ready="canPlay" :scored="scored" :available="choices.length" :rounds="roundCount" :games="chosenGames" :mode="mode" :custom-rules="customRules" :best="best" :last="last" :average="average" @start="newGame" @mode="setMode" @rule="setRule" />
  <RoundIntro :visible="intro" :number="status.index" :count="status.count" :progress="status.progress" :label="status.label" :tip="status.tip" :mode="gameMode" :countdown="status.countdown" :steps="COUNTDOWN" :waiting="status.waiting" :held="status.held" @begin="startHeld" />
</template>

<style scoped>
.map-full {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.map-full.shown {
  pointer-events: auto;
}

.map-full :deep(.map-mode) {
  top: 16px;
  right: 16px;
  bottom: auto;
  left: auto;
}

.map-full.shown :deep(.map-scale) {
  left: 10px;
}

.bigmap {
  position: fixed;
  inset: 0;
  z-index: 5;
  background: #000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.45s ease, visibility 0s linear 0.45s;
}

.bigmap.shown {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.45s ease;
}

.bigmap.atlas :deep(.marker:not(.atlas)), .bigmap.atlas :deep(.map-line) {
  display: none;
}

.bigmap.atlas :deep(.map-mode) {
  right: 10px;
  left: auto;
}

.bigmap.atlas :deep(.map-mode ~ .map-scale) {
  left: 10px;
}

.bigmap.atlas :deep(.map-mode:not([hidden]) ~ .map-elevation) {
  right: 52px;
}

.bigmap :deep(.marker.guess:not(.atlas) img) {
  left: -22.5px;
  top: -22.5px;
  width: 45px;
}

.bigmap :deep(.marker.answer:not(.atlas) .dot) {
  left: -27px;
  top: -33px;
  width: 48px;
  transform-origin: 27px 33px;
}

.bigmap :deep(.map-view) {
  transition: opacity 0.45s ease;
}

.bigmap.waiting :deep(.map-view) {
  opacity: 0;
}

.map-loading {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.view-loading {
  position: fixed;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  background: #000;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.3s ease, visibility 0s linear 0.3s;
}

.view-loading.shown {
  opacity: 1;
  visibility: visible;
  transition: none;
}

.bigmap.waiting .map-loading {
  opacity: 1;
}

.reveal {
  transition: opacity 0.45s ease;
}

.held {
  opacity: 0;
  visibility: hidden;
}

.bigmap :deep(.map-canvas) {
  cursor: grab;
}

.viewing {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 8px 8px 18px;
  transform: translateX(-50%);
}

.viewing span {
  font-size: 14px;
  white-space: nowrap;
}

.viewing .viewing-best {
  padding-left: 16px;
  border-left: 1px solid var(--border);
  color: var(--muted);
}

.viewing-best strong {
  color: var(--text);
  font-weight: 600;
}

.viewing button {
  padding: 8px 14px;
  font-size: 13px;
  white-space: nowrap;
}
</style>
