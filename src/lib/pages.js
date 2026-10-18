import { MAX_POINTS } from "./game.js"
import { decodeScore, decodeSeed } from "./seed.js"

export const PAGES = {
  play: {
    name: "New Game",
    description: "Pick Zero Dawn, Forbidden West or both, choose your rules, then guess where each photosphere was taken.",
    image: "social/play.jpg",
    buttons: [["Play", "play"], ["Open the map", "map"]]
  },
  map: {
    name: "World Map",
    description: "Explore the maps of Horizon Zero Dawn and Horizon Forbidden West, and every photosphere you have found.",
    image: "social/map.jpg",
    buttons: [["Open the map", "map"], ["Play", "play"]]
  },
  challenge: {
    name: "Challenge",
    description: "Play the same photospheres and try to beat their score.",
    image: "social/challenge.jpg",
    buttons: [],
    linked: false
  }
}

export const PAGE_ALIASES = { setup: "play", game: "play" }

export function pageFor(route) {
  return Object.hasOwn(PAGES, route) ? route : PAGE_ALIASES[route] ?? null
}

export function challengeDetail(search, origin) {
  const seed = decodeSeed(search)
  if (!seed) {
    return null
  }
  const max = seed.rounds.length * MAX_POINTS
  const score = decodeScore(search, max)
  const url = `${origin}/challenge?seed=${seed.code}${score === null ? "" : `&score=${score}`}`
  return {
    description: score === null ? PAGES.challenge.description : `Score to beat: ${score.toLocaleString("en")} out of ${max.toLocaleString("en")}. Play the same ${seed.rounds.length} photospheres and see if you can do better.`,
    url,
    buttons: [["Accept the Challenge", url]]
  }
}

function embedJson(json, title, url, description, imageUrl, buttons) {
  const embed = JSON.parse(json)
  embed.component.components = [
    { type: 10, content: `## ${url ? `[${title}](${url})` : title}\n${description}` },
    { type: 12, items: [{ media: { url: imageUrl } }] }
  ].concat(buttons.length ? [{ type: 1, components: buttons.map(([label, link]) => ({ type: 2, style: 5, url: link, label })) }] : [])
  return JSON.stringify(embed)
}

export function pageHtml(index, page, origin, detail = {}) {
  const base = PAGES[page]
  const title = `${base.name} · Horizon Wayfinder`
  const description = detail.description ?? base.description
  const url = detail.url ?? (base.linked === false ? null : `${origin}/${page}`)
  const buttons = detail.buttons ?? base.buttons.map(([label, route]) => [label, `${origin}/${route}`])
  const imageUrl = `${origin}/${base.image}`
  const swaps = [
    [/<title>[^<]*<\/title>/, `<title>${title}</title>`],
    [/(<meta name="description" content=")[^"]*/, `$1${description}`],
    url ? [/(<link rel="canonical" href=")[^"]*/, `$1${url}`] : [/\s*<link rel="canonical"[^>]*>/, ""],
    [/(<meta property="og:title" content=")[^"]*/, `$1${title}`],
    [/(<meta property="og:description" content=")[^"]*/, `$1${description}`],
    url ? [/(<meta property="og:url" content=")[^"]*/, `$1${url}`] : [/\s*<meta property="og:url"[^>]*>/, ""],
    [/(<meta property="og:image" content=")[^"]*/, `$1${imageUrl}`],
    [/(<script id="discord:component-embed" type="application\/json">)([\s\S]*?)(<\/script>)/, (whole, open, json, close) => open + embedJson(json, title, url, description, imageUrl, buttons) + close]
  ]
  let html = index
  for (const [pattern, replacement] of swaps) {
    if (!pattern.test(html)) {
      throw new Error(`${page}.html: index.html has no match for ${pattern}`)
    }
    html = html.replace(pattern, replacement)
  }
  return html
}
