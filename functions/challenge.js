import { challengeDetail, pageHtml } from "../src/lib/pages.js"

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const detail = challengeDetail(url.search, url.origin)
  if (!detail) {
    return env.ASSETS.fetch(request)
  }
  const index = await env.ASSETS.fetch(new URL("/", url))
  if (!index.ok) {
    throw new Error(`index.html: ${index.status}`)
  }
  return new Response(pageHtml(await index.text(), "challenge", url.origin, detail), { headers: { "Content-Type": "text/html; charset=utf-8" } })
}
