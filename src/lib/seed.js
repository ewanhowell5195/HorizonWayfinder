import { TRIBES, bitsToRules, gamesOf, rulesToBits } from "./rules.js"

const VERSION = "6"
const EPOCH = Date.UTC(2020, 0, 1) / 1000
const TIME_DIGITS = 6
const VIEW_DIGITS = 3
const RULE_DIGITS = { 3: 3, 4: 5, 5: 6, 6: 6 }
const LIMIT_DIGITS = { 6: 2 }

function checksum(text) {
  let sum = 0
  for (let n = 0; n < text.length; n++) {
    sum = (sum * 31 + text.charCodeAt(n)) % 36
  }
  return sum.toString(36)
}

function nameToSeconds(name) {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(name)
  if (!match) {
    return null
  }
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  return Date.UTC(year, month - 1, day, hour, minute, second) / 1000 - EPOCH
}

function secondsToName(seconds) {
  const date = new Date((seconds + EPOCH) * 1000)
  const pad = value => String(value).padStart(2, "0")
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
}

export function randomCode() {
  return Math.floor(Math.random() * 36 ** VIEW_DIGITS)
}

export function seededRandom(code) {
  let state = code + 0x9e3779b9
  return () => {
    state = state + 0x6d2b79f5 | 0
    let value = Math.imul(state ^ state >>> 15, 1 | state)
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export function encodeSeed({ rules, rounds, time }) {
  const body = VERSION + rulesToBits(rules).toString(36).padStart(RULE_DIGITS[VERSION], "0") + (time || 0).toString(36).padStart(LIMIT_DIGITS[VERSION], "0") + rounds.map(round => nameToSeconds(round.name).toString(36).padStart(TIME_DIGITS, "0") + round.code.toString(36).padStart(VIEW_DIGITS, "0")).join("")
  return body + checksum(body)
}

export function seedLink(code, score) {
  return `${location.origin}${import.meta.env.BASE_URL}challenge?seed=${code}${Number.isInteger(score) ? `&score=${score}` : ""}`
}

export function decodeScore(input, max) {
  const match = /[?&]score=(\d+)/.exec(String(input || ""))
  const score = match ? Number(match[1]) : null
  return score !== null && score <= max ? score : null
}

export function decodeSeed(input) {
  const text = String(input || "").trim()
  const fromLink = /[?&]seed=([0-9a-z]+)/i.exec(text)
  const code = (fromLink ? fromLink[1] : text).toLowerCase()
  const roundLength = TIME_DIGITS + VIEW_DIGITS
  const digits = RULE_DIGITS[code[0]]
  const limitDigits = LIMIT_DIGITS[code[0]] || 0
  const head = 1 + digits + limitDigits
  if (!/^[0-9a-z]+$/.test(code) || !digits || (code.length - head - 1) % roundLength !== 0 || code.length <= head + 1) {
    return null
  }
  const body = code.slice(0, -1)
  if (checksum(body) !== code.slice(-1)) {
    return null
  }
  const rounds = []
  for (let at = head; at < body.length; at += roundLength) {
    const name = secondsToName(parseInt(body.slice(at, at + TIME_DIGITS), 36))
    rounds.push({ name, code: parseInt(body.slice(at + TIME_DIGITS, at + roundLength), 36) })
  }
  const version = Number(code[0])
  const unknown = TRIBES.filter(tribe => version === 3 || (tribe.since ?? 4) > version)
  const rules = bitsToRules(parseInt(code.slice(1, 1 + digits), 36) | rulesToBits(Object.fromEntries(unknown.map(tribe => [tribe.id, true]))))
  const time = limitDigits ? parseInt(code.slice(1 + digits, head), 36) : 0
  return { code, games: gamesOf(rules), rules, rounds, time }
}
