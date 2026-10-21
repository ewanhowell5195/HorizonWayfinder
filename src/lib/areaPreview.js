const FADE_MS = 300
const DIM = 0.3
const PAD = 32
const ACCENT = [242 / 255, 165 / 255, 65 / 255]
const SLOTS = 16

const vertexSource = `#version 300 es
  in vec2 position;
  out vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }`

const litSource = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform sampler2D uArea;
  uniform sampler2D uMasks[4];
  uniform vec4 uWeights[4];
  uniform float uWhole;
  uniform vec4 uRect;
  out vec4 color;
  void main() {
    vec2 uv = (vUv - uRect.xy) / uRect.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
      discard;
    }
    uv.y = 1.0 - uv.y;
    float clear = 1.0 - uWhole;
    vec4 p0 = vec4(1.0) - texture(uMasks[0], uv) * uWeights[0];
    vec4 p1 = vec4(1.0) - texture(uMasks[1], uv) * uWeights[1];
    vec4 p2 = vec4(1.0) - texture(uMasks[2], uv) * uWeights[2];
    vec4 p3 = vec4(1.0) - texture(uMasks[3], uv) * uWeights[3];
    vec4 p = p0 * p1 * p2 * p3;
    clear *= p.x * p.y * p.z * p.w;
    color = texture(uArea, uv) * (1.0 - clear);
  }`

const blurSource = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform sampler2D uSource;
  uniform vec2 uStep;
  uniform float uSigma;
  uniform float uMerge;
  uniform sampler2D uBase;
  out vec4 color;
  float alphaAt(vec2 uv) {
    float a = texture(uSource, uv).a;
    if (uMerge > 0.5) {
      float base = texture(uBase, uv).a;
      a = base + a * (1.0 - base);
    }
    return a;
  }
  void main() {
    float total = 0.0;
    float sum = 0.0;
    int radius = int(ceil(uSigma * 3.0));
    for (int n = -64; n <= 64; n++) {
      if (n < -radius || n > radius) {
        continue;
      }
      float w = exp(-float(n * n) / (2.0 * uSigma * uSigma));
      sum += alphaAt(vUv + uStep * float(n)) * w;
      total += w;
    }
    color = vec4(0.0, 0.0, 0.0, sum / total);
  }`

const compositeSource = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform sampler2D uLit;
  uniform sampler2D uNear;
  uniform sampler2D uFar;
  uniform vec3 uAccent;
  out vec4 color;
  void main() {
    vec4 lit = texture(uLit, vUv);
    float near = texture(uNear, vUv).a;
    float far = texture(uFar, vUv).a;
    vec4 layer = lit + vec4(uAccent * near, near) * (1.0 - lit.a);
    color = layer + vec4(uAccent * far, far) * (1.0 - layer.a);
  }`

const dimSource = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform sampler2D uArea;
  uniform vec4 uRect;
  uniform float uAlpha;
  out vec4 color;
  void main() {
    vec2 uv = (vUv - uRect.xy) / uRect.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
      discard;
    }
    uv.y = 1.0 - uv.y;
    color = texture(uArea, uv) * uAlpha;
  }`

const MAX_TEXTURE = matchMedia("(pointer: coarse)").matches ? 1024 : 2048
const images = new Map()
const masks = new Map()

async function bitmap(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`)
  }
  return createImageBitmap(await response.blob(), { premultiplyAlpha: "none" })
}

function fitted(width, height) {
  const scale = Math.min(MAX_TEXTURE / width, 1)
  return [Math.round(width * scale), Math.round(height * scale)]
}

function shrink(image) {
  const [width, height] = fitted(image.width, image.height)
  if (width === image.width) {
    return image
  }
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  context.imageSmoothingQuality = "high"
  context.drawImage(image, 0, 0, width, height)
  image.close()
  return canvas
}

function areaImage(area) {
  if (!images.has(area)) {
    images.set(area, bitmap(`/backgrounds/area-${area}.avif`).then(image => ({ width: image.width, height: image.height, source: shrink(image) })))
  }
  return images.get(area)
}

function packedMasks(game, tribes) {
  const key = `${game}:${tribes.join()}`
  if (!masks.has(key)) {
    masks.set(key, Promise.all(tribes.map(tribe => bitmap(`/map/tribes/${game}-${tribe}.webp`))).then(list => {
      const [width, height] = fitted(list[0].width, list[0].height)
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d", { willReadFrequently: true })
      context.imageSmoothingQuality = "high"
      const packs = []
      for (let start = 0; start < list.length; start += 4) {
        const data = new Uint8Array(width * height * 4)
        list.slice(start, start + 4).forEach((image, channel) => {
          context.clearRect(0, 0, width, height)
          context.drawImage(image, 0, 0, width, height)
          const pixels = context.getImageData(0, 0, width, height).data
          for (let n = 0; n < width * height; n++) {
            data[n * 4 + channel] = pixels[n * 4]
          }
          image.close()
        })
        packs.push(data)
      }
      return { width, height, packs, tribes }
    }))
  }
  return masks.get(key)
}

function ease(t) {
  let low = 0, high = 1, x = t
  for (let n = 0; n < 12; n++) {
    x = (low + high) / 2
    const bx = 3 * 0.25 * x * (1 - x) ** 2 + 3 * 0.25 * x * x * (1 - x) + x ** 3
    if (bx < t) {
      low = x
    } else {
      high = x
    }
  }
  return 3 * 0.1 * x * (1 - x) ** 2 + 3 * x * x * (1 - x) + x ** 3
}

const previews = new Map()

export function previewFor(game, areaIds) {
  if (!previews.has(game)) {
    const canvas = document.createElement("canvas")
    canvas.className = "area-preview"
    const listeners = new Set()
    let size = null
    const preview = createAreaPreview(canvas, { onSize: value => {
      size = value
      listeners.forEach(listener => listener(value))
    } })
    const loading = preview.load(game, areaIds, null)
    previews.set(game, { canvas, preview, loading, listen(listener) {
      listeners.add(listener)
      if (size) {
        listener(size)
      }
      return () => listeners.delete(listener)
    } })
  }
  return previews.get(game)
}

function createAreaPreview(canvas, { onSize } = {}) {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) {
    throw new Error("WebGL2 is not available in this browser.")
  }

  function compile(source) {
    function shader(type, text) {
      const result = gl.createShader(type)
      gl.shaderSource(result, text)
      gl.compileShader(result)
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(result))
      }
      return result
    }
    const program = gl.createProgram()
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource))
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, source))
    gl.bindAttribLocation(program, 0, "position")
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program))
    }
    return program
  }

  const programs = { lit: compile(litSource), blur: compile(blurSource), composite: compile(compositeSource), dim: compile(dimSource) }
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  function uniform(program, name) {
    return gl.getUniformLocation(program, name)
  }

  function texture(source, width, height) {
    const result = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, result)
    if (source instanceof Uint8Array) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, source)
    } else {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    }
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return result
  }

  function target(width, height) {
    const color = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, color)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const framebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0)
    return { color, framebuffer, width, height }
  }

  function release(targets) {
    for (const item of Object.values(targets || {})) {
      gl.deleteTexture(item.color)
      gl.deleteFramebuffer(item.framebuffer)
    }
  }

  const blank = texture(new Uint8Array(4), 1, 1)
  let areas = []
  let maskTextures = []
  let maskTribes = []
  let size = null
  let targets = null
  let lit = new Set()
  let litTribes = new Set()
  let hasTribes = false
  let tribesKey = null
  let tribeLookup = null
  const weights = new Map()
  let frame = 0
  let destroyed = false

  function pairKey(area, tribe) {
    return `${area}|${tribe}`
  }

  function wanted(area, tribe) {
    return lit.has(area) && (tribe === null || litTribes.has(tribe))
  }

  function retarget(now) {
    for (const area of areas) {
      for (const tribe of hasTribes ? area.tribes : [null]) {
        const key = pairKey(area.id, tribe)
        const goal = wanted(area.id, tribe) ? 1 : 0
        const state = weights.get(key)
        if (!state) {
          weights.set(key, { from: goal, to: goal, start: now })
        } else if (state.to !== goal) {
          const current = value(state, now)
          weights.set(key, { from: current, to: goal, start: now })
        }
      }
    }
  }

  function value(state, now) {
    const t = Math.min(Math.max((now - state.start) / FADE_MS, 0), 1)
    return state.from + (state.to - state.from) * ease(t)
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(Math.round(canvas.clientWidth * ratio), 1)
    const height = Math.max(Math.round(canvas.clientHeight * ratio), 1)
    if (canvas.width !== width || canvas.height !== height || !targets) {
      canvas.width = width
      canvas.height = height
      release(targets)
      const half = [Math.max(width >> 1, 1), Math.max(height >> 1, 1)]
      targets = { lit: target(width, height), nearX: target(width, height), near: target(width, height), farX: target(half[0], half[1]), far: target(half[0], half[1]) }
    }
    return ratio
  }

  function rect(ratio) {
    const pad = PAD * ratio
    const innerWidth = canvas.width - pad * 2, innerHeight = canvas.height - pad * 2
    const scale = Math.min(innerWidth / size[0], innerHeight / size[1])
    const width = size[0] * scale, height = size[1] * scale
    return [(canvas.width - width) / 2 / canvas.width, (canvas.height - height) / 2 / canvas.height, width / canvas.width, height / canvas.height]
  }

  function blurPass(source, into, step, sigma, base) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, into.framebuffer)
    gl.viewport(0, 0, into.width, into.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(programs.blur)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, source.color)
    gl.uniform1i(uniform(programs.blur, "uSource"), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, base ? base.color : blank)
    gl.uniform1i(uniform(programs.blur, "uBase"), 1)
    gl.uniform1f(uniform(programs.blur, "uMerge"), base ? 1 : 0)
    gl.uniform2f(uniform(programs.blur, "uStep"), step[0], step[1])
    gl.uniform1f(uniform(programs.blur, "uSigma"), Math.min(sigma, 21))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  function draw(now) {
    frame = 0
    if (destroyed || !size || !areas.length) {
      return
    }
    const ratio = resize()
    const box = rect(ratio)
    gl.disable(gl.BLEND)
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets.lit.framebuffer)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(programs.lit)
    gl.uniform4fv(uniform(programs.lit, "uRect"), box)
    gl.uniform1iv(uniform(programs.lit, "uMasks"), [1, 2, 3, 4])
    gl.uniform1i(uniform(programs.lit, "uArea"), 0)
    for (let n = 0; n < 4; n++) {
      gl.activeTexture(gl.TEXTURE1 + n)
      gl.bindTexture(gl.TEXTURE_2D, maskTextures[n] || blank)
    }
    let animating = false
    for (const area of areas) {
      const slots = new Float32Array(SLOTS)
      let whole = 0
      if (hasTribes) {
        for (const tribe of area.tribes) {
          const state = weights.get(pairKey(area.id, tribe))
          const slot = maskTribes.indexOf(tribe)
          if (state && slot >= 0) {
            slots[slot] = value(state, now)
            animating ||= now - state.start < FADE_MS
          }
        }
      } else {
        const state = weights.get(pairKey(area.id, null))
        whole = state ? value(state, now) : 0
        animating ||= state && now - state.start < FADE_MS
      }
      if (!whole && slots.every(slot => !slot)) {
        continue
      }
      gl.uniform4fv(uniform(programs.lit, "uWeights"), slots)
      gl.uniform1f(uniform(programs.lit, "uWhole"), whole)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, area.texture)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    gl.disable(gl.BLEND)
    blurPass(targets.lit, targets.nearX, [1 / canvas.width, 0], 2 * ratio)
    blurPass(targets.nearX, targets.near, [0, 1 / canvas.height], 2 * ratio)
    blurPass(targets.near, targets.farX, [2 / canvas.width, 0], 5 * ratio, targets.lit)
    blurPass(targets.farX, targets.far, [0, 2 / canvas.height], 5 * ratio)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(programs.composite)
    const inputs = [targets.lit, targets.near, targets.far]
    inputs.forEach((item, n) => {
      gl.activeTexture(gl.TEXTURE0 + n)
      gl.bindTexture(gl.TEXTURE_2D, item.color)
    })
    gl.uniform1i(uniform(programs.composite, "uLit"), 0)
    gl.uniform1i(uniform(programs.composite, "uNear"), 1)
    gl.uniform1i(uniform(programs.composite, "uFar"), 2)
    gl.uniform3fv(uniform(programs.composite, "uAccent"), ACCENT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(programs.dim)
    gl.uniform4fv(uniform(programs.dim, "uRect"), box)
    gl.uniform1f(uniform(programs.dim, "uAlpha"), DIM)
    gl.uniform1i(uniform(programs.dim, "uArea"), 0)
    gl.activeTexture(gl.TEXTURE0)
    for (const area of areas) {
      gl.bindTexture(gl.TEXTURE_2D, area.texture)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    gl.disable(gl.BLEND)
    if (animating) {
      request()
    }
  }

  function request() {
    if (!frame && !destroyed) {
      frame = requestAnimationFrame(draw)
    }
  }

  const observer = new ResizeObserver(request)
  observer.observe(canvas)

  return {
    async load(game, ids, tribeAreas) {
      const loaded = await Promise.all(ids.map(areaImage))
      if (destroyed) {
        return
      }
      size = [loaded[0].width, loaded[0].height]
      onSize?.(size)
      areas = ids.map((id, n) => ({ id, texture: texture(loaded[n].source), tribes: (tribeLookup || tribeAreas)?.[id] || [] }))
      retarget(performance.now())
      request()
      if (tribeAreas) {
        this.setTribes(game, tribeAreas)
      }
    },
    async setTribes(game, tribeAreas) {
      const tribes = Array.from(new Set(Object.values(tribeAreas).flat())).sort()
      const key = JSON.stringify(tribeAreas)
      if (!tribes.length || key === tribesKey) {
        return
      }
      tribesKey = key
      tribeLookup = tribeAreas
      const packed = await packedMasks(game, tribes)
      if (destroyed) {
        return
      }
      maskTextures.forEach(item => gl.deleteTexture(item))
      maskTextures = packed.packs.map(data => texture(data, packed.width, packed.height))
      maskTribes = packed.tribes
      areas = areas.map(area => Object.assign(area, { tribes: tribeAreas[area.id] || [] }))
      hasTribes = true
      weights.clear()
      retarget(performance.now())
      request()
    },
    setLit(areaIds, tribeIds, instant = false) {
      lit = new Set(areaIds || [])
      litTribes = new Set(tribeIds || [])
      if (instant) {
        weights.clear()
      }
      retarget(performance.now())
      request()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      release(targets)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }
}
