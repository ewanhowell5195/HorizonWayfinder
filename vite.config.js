import fs from "node:fs"
import path from "node:path"
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"
import { PAGES, PAGE_ALIASES, challengeDetail, pageFor, pageHtml } from "./src/lib/pages.js"

// the routes with a file in functions/
const CHALLENGE_ROUTES = ["challenge", "game"]

function minifyJson() {
  let outDir
  return {
    name: "minify-json",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const files = (await fs.promises.readdir(outDir, { recursive: true })).filter(file => file.endsWith(".json"))
      for (const file of files) {
        const full = path.join(outDir, file)
        await fs.promises.writeFile(full, JSON.stringify(JSON.parse(await fs.promises.readFile(full, "utf8"))))
      }
    }
  }
}

function pageStubs() {
  let config
  return {
    name: "page-stubs",
    configResolved(resolved) {
      config = resolved
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const route = req.url.split("?")[0].slice(1)
        const page = pageFor(route)
        if (req.method !== "GET" || !page) {
          next()
          return
        }
        try {
          const index = await server.transformIndexHtml(req.url, await fs.promises.readFile(path.join(config.root, "index.html"), "utf8"))
          res.setHeader("Content-Type", "text/html; charset=utf-8")
          const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers["x-forwarded-host"] || req.headers.host}`
          const detail = CHALLENGE_ROUTES.includes(route) ? challengeDetail(req.url, origin) : null
          res.end(pageHtml(index, detail ? "challenge" : page, origin, detail ?? {}))
        } catch (error) {
          next(error)
        }
      })
    },
    async closeBundle() {
      if (config.command !== "build") {
        return
      }
      const outDir = path.resolve(config.root, config.build.outDir)
      const index = await fs.promises.readFile(path.join(outDir, "index.html"), "utf8")
      for (const [route, page] of Object.keys(PAGES).map(page => [page, page]).concat(Object.entries(PAGE_ALIASES))) {
        await fs.promises.writeFile(path.join(outDir, `${route}.html`), pageHtml(index, page, "https://horizonwayfind.ing"))
      }
    }
  }
}

function reloadWebGL() {
  const owners = ["App.vue", "MapView.vue", "PhotoSphere.vue", "SlideBackdrop.vue"]
  const scripts = new Map()
  const scriptOf = code => code.match(/<script[\s\S]*?<\/script>/)?.[0]
  return {
    name: "reload-webgl",
    apply: "serve",
    enforce: "pre",
    transform(code, id) {
      if (owners.includes(path.basename(id))) {
        scripts.set(id, scriptOf(code))
      }
    },
    async handleHotUpdate({ file, server, read }) {
      const name = path.basename(file)
      let reload = file.includes("/src/lib/")
      if (owners.includes(name)) {
        const script = scriptOf(await read())
        reload = scripts.has(file) && scripts.get(file) !== script
        scripts.set(file, script)
      }
      if (reload) {
        server.ws.send({ type: "full-reload" })
        return []
      }
    }
  }
}

export default defineConfig({
  plugins: [reloadWebGL(), vue(), minifyJson(), pageStubs()],
  server: { host: "127.0.0.1", port: 9123, strictPort: true, proxy: { "/api": { target: "https://horizonwayfind.ing", changeOrigin: true } } }
})
