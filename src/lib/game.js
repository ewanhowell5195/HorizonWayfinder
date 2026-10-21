export const ROUNDS = 5
export const MAX_POINTS = 5000
const PERFECT_METRES = 25
// hzd is 2000 m scaled by its world.json piece's diagonal against hfw-main
const FALLOFF_METRES = { hfw: 2000, hzd: 1598 }

export function points(metres, game) {
  return metres <= PERFECT_METRES ? MAX_POINTS : Math.round(MAX_POINTS * Math.exp(-(metres - PERFECT_METRES) / FALLOFF_METRES[game]))
}

export function pluralWord(count, word) {
  return count === 1 ? word : `${word}s`
}

export function plural(count, word) {
  return `${count} ${pluralWord(count, word)}`
}

export function distanceLabel(entry) {
  return entry.miss || formatDistance(entry.metres)
}

export function formatDistance(metres) {
  if (metres < 25) {
    return `${metres.toFixed(metres < 5 ? 2 : 1)} m`
  }
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(metres < 10000 ? 2 : 1)} km`
}

export function shuffle(list) {
  const copy = list.slice()
  for (let n = copy.length - 1; n > 0; n--) {
    const k = Math.floor(Math.random() * (n + 1))
    const swap = copy[n]
    copy[n] = copy[k]
    copy[k] = swap
  }
  return copy
}

export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function readStore(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}
