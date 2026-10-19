export const RULES = [
  { id: "pan", name: "Looking around", detail: "Drag or use the arrow keys" },
  { id: "zoom", name: "Zooming", detail: "Scroll or pinch to zoom in" },
  { id: "compass", name: "Compass", detail: "Which way you are facing" },
  { id: "icons", name: "Map icons", detail: "Campfires, machine sites and more" },
  { id: "map3d", name: "3D map", detail: "Orbit the map in 3D" },
  { id: "readouts", name: "Scale and elevation", detail: "Map distance and ground height" }
]

export const LOCATIONS = [
  { id: "zeroDawn", game: "hzd", name: "Zero Dawn" },
  { id: "frozenWilds", game: "hzd", name: "The Frozen Wilds" },
  { id: "forbiddenWest", game: "hfw", name: "Forbidden West" },
  { id: "burningShores", game: "hfw", name: "Burning Shores" },
  { id: "farZenith", game: "hfw", name: "Far Zenith Facility" }
]

export const TRIBES = [
  { id: "tribeNora", tribe: "nora", name: "Nora", games: ["hzd"] },
  { id: "tribeBanuk", tribe: "banuk", name: "Banuk", games: ["hzd"] },
  { id: "tribeCarja", tribe: "carja", name: "Carja", games: ["hzd", "hfw"] },
  { id: "tribeShadowCarja", tribe: "shadowCarja", name: "Shadow Carja", games: ["hzd"] },
  { id: "tribeOseram", tribe: "oseram", name: "Oseram", games: ["hzd", "hfw"] },
  { id: "tribeUtaru", tribe: "utaru", name: "Utaru", games: ["hfw"] },
  { id: "tribeTenakthLowlandClan", tribe: "tenakthLowlandClan", name: "Tenakth Lowland", games: ["hfw"] },
  { id: "tribeTenakthDesertClan", tribe: "tenakthDesertClan", name: "Tenakth Desert", games: ["hfw"] },
  { id: "tribeTenakthSkyClan", tribe: "tenakthSkyClan", name: "Tenakth Sky", games: ["hfw"] },
  { id: "tribeQuen", tribe: "quen", name: "Quen", games: ["hfw"] },
  { id: "tribeFarZenith", tribe: "farZenith", name: "Far Zenith", games: ["hfw"] },
  { id: "tribeNone", tribe: null, name: "No tribe", games: ["hzd", "hfw"] },
  { id: "tribeNeutral", tribe: "neutral", name: "Neutral", games: ["hzd", "hfw"], since: 5 },
  { id: "tribeEclipse", tribe: "eclipse", name: "Eclipse", games: ["hzd"], parent: "shadowCarja", since: 5 },
  { id: "tribeRebels", tribe: "tenakthRebels", name: "Tenakth Rebels", games: ["hfw"], parent: "tenakthAllClans", since: 5 },
  { id: "tribeBandits", tribe: "bandits", name: "Bandits", games: ["hzd"], since: 5 }
]

// keys are the ids build_tribes.py makes from the tribe painter's names
export const SHARED_TRIBES = { tenakthAllClans: ["tribeTenakthLowlandClan", "tribeTenakthDesertClan", "tribeTenakthSkyClan"] }

const SETTINGS = RULES.concat(LOCATIONS, TRIBES)
const ALL = Object.fromEntries(SETTINGS.map(setting => [setting.id, true]))

export const MODE_RULES = { easy: ALL, normal: Object.assign({}, ALL, { icons: false, map3d: false }), hard: Object.assign({}, ALL, { pan: false, zoom: false, icons: false, map3d: false, readouts: false }) }

export const MODES = [
  { id: "easy", name: "Easy", summary: "Everything on" },
  { id: "normal", name: "Normal", summary: "No map icons or 3D map" },
  { id: "hard", name: "Hard", summary: "Fixed view, compass only" },
  { id: "custom", name: "Custom", summary: "Choose what you get" }
]

export const MODE_NAMES = Object.fromEntries(MODES.map(mode => [mode.id, mode.name]))

export function fullRules(rules) {
  return Object.fromEntries(SETTINGS.map(setting => [setting.id, rules?.[setting.id] !== false]))
}

export function withGames(rules, games) {
  return Object.assign({}, rules, Object.fromEntries(LOCATIONS.map(location => [location.id, games === "both" || location.game === games])))
}

export function gamesOf(rules) {
  const on = new Set(LOCATIONS.filter(location => rules[location.id]).map(location => location.game))
  return on.size === 1 ? Array.from(on)[0] : "both"
}

export function wholeGames(rules) {
  return ["hzd", "hfw"].every(game => {
    const states = LOCATIONS.filter(location => location.game === game).map(location => rules[location.id])
    return states.every(Boolean) || !states.some(Boolean)
  })
}

export function tribesOf(games) {
  return TRIBES.filter(tribe => games === "both" || tribe.games.includes(games))
}

export function offTribes(rules) {
  return tribesOf(gamesOf(rules)).filter(tribe => !rules[tribe.id])
}

export function modeOf(rules) {
  const mode = Object.keys(MODE_RULES).find(name => RULES.every(rule => MODE_RULES[name][rule.id] === rules[rule.id]))
  return mode && wholeGames(rules) && !offTribes(rules).length ? mode : "custom"
}

export function rulesToBits(rules) {
  return SETTINGS.reduce((bits, setting, n) => bits | (rules[setting.id] ? 1 << n : 0), 0)
}

export function bitsToRules(bits) {
  return Object.fromEntries(SETTINGS.map((setting, n) => [setting.id, Boolean(bits & 1 << n)]))
}

export function tribeRule(tribe) {
  return TRIBES.find(entry => entry.tribe === tribe)?.id || "tribeNone"
}

export function tribeRules(tribe) {
  const entry = TRIBES.find(item => item.tribe === tribe)
  return entry?.parent ? [entry.id].concat(tribeRules(entry.parent)) : SHARED_TRIBES[tribe] || [tribeRule(tribe)]
}

export function tribeOn(rules, tribe) {
  const entry = TRIBES.find(item => item.tribe === tribe)
  return entry?.parent ? Boolean(rules[entry.id]) && tribeOn(rules, entry.parent) : tribeRules(tribe).some(id => rules[id])
}

export function tribeOrder(list) {
  return list.slice().sort((a, b) => a.name.localeCompare(b.name))
}

export function missingRules(rules) {
  return RULES.filter(rule => !rules[rule.id]).map(rule => rule.name.toLowerCase())
}

export function locationNames(rules) {
  return LOCATIONS.filter(location => rules[location.id]).map(location => location.name)
}
