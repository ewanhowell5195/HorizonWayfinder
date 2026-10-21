import { NOISE_REVEAL_GLSL } from "./noise.js"

const MIN_FOV = 15
const MAX_FOV = 110
const SPIN_DECAY = 4
const SPIN_MAX = 6
const SPIN_STOP = 0.01
const SPIN_HOLD_MS = 80
const LOW_MEMORY_SIZE = 4096
const REVEAL_SECONDS = 1.2
const HATCH_SCREEN_PX = 600
const REVEAL_BAND = 0.5
const LOW_MEMORY = (navigator.deviceMemory ?? 8) <= 4 || matchMedia("(pointer: coarse)").matches

const vertexSource = `#version 300 es
  in vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }`

const fragmentSource = `#version 300 es
  precision highp float;
  uniform sampler2D panorama;
  uniform vec2 resolution;
  uniform float yaw;
  uniform float pitch;
  uniform float tanHalf;
  uniform float reveal;
  uniform sampler2D hatch;
  uniform float hatchSize;
  uniform bool hasHatch;
  out vec4 color;
  const float PI = 3.14159265358979;
  ${NOISE_REVEAL_GLSL}

  void main() {
    vec2 ndc = gl_FragCoord.xy / resolution * 2.0 - 1.0;
    float aspect = resolution.x / resolution.y;
    vec3 forward = vec3(sin(yaw) * cos(pitch), cos(yaw) * cos(pitch), sin(pitch));
    vec3 right = vec3(cos(yaw), -sin(yaw), 0.0);
    vec3 up = cross(right, forward);
    vec2 extent = tanHalf * vec2(max(aspect, 1.0), max(1.0 / aspect, 1.0));
    vec3 dir = normalize(forward + right * ndc.x * extent.x + up * ndc.y * extent.y);
    vec2 uv = vec2(atan(dir.x, dir.y) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(dir.z, -1.0, 1.0)) / PI);
    vec2 dx = dFdx(uv);
    vec2 dy = dFdy(uv);
    dx.x -= round(dx.x);
    dy.x -= round(dy.x);
    color = textureGrad(panorama, uv, dx, dy);
    if (reveal < 1.0) {
      float spread = clamp((noiseField(resolution.y * 0.55) - 0.15) / 0.51, 0.0, 1.0);
      float edge = clamp((reveal * (1.0 + ${REVEAL_BAND.toFixed(2)}) - spread) / ${REVEAL_BAND.toFixed(2)}, 0.0, 1.0);
      float shade = hasHatch ? clamp(((texture(hatch, gl_FragCoord.xy / hatchSize).r - 0.25) / 0.69 - 1.0 + edge) * 50.0, 0.0, 1.0) : edge;
      color.rgb *= shade;
    }
  }`

export function createSphere(canvas, { onHeading, maxPitch = Math.PI / 2 - 0.001 } = {}) {
  const gl = canvas.getContext("webgl2", { antialias: false })
  const teardown = new AbortController()
  let destroyed = false
  if (!gl) {
    throw new Error("WebGL2 is not available in this browser.")
  }

  const view = { yaw: 0, pitch: 0, fov: 75 }
  let viewSize = [canvas.clientWidth, canvas.clientHeight]
  const sizer = new ResizeObserver(([entry]) => viewSize = [entry.contentRect.width, entry.contentRect.height])
  sizer.observe(canvas)
  const anisotropy = gl.getExtension("EXT_texture_filter_anisotropic")
  let texture = null
  let needsDraw = true
  let revealStart = -Infinity
  let revealed = null
  let active = true
  let controls = { pan: true, zoom: true }
  let spin = { yaw: 0, pitch: 0 }
  let lastMove = 0
  let lastFrame = performance.now()
  let generation = 0
  let shownUrl = null
  let contextLost = false
  const sources = new WeakMap()

  function compile(type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader))
    }
    return shader
  }

  let program = null
  let uniforms = {}

  function initGL() {
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program))
    }
    uniforms = Object.fromEntries(["panorama", "resolution", "yaw", "pitch", "tanHalf", "reveal", "hatch", "hatchSize", "hasHatch"].map(name => [name, gl.getUniformLocation(program, name)]))
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const positionLocation = gl.getAttribLocation(program, "position")
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  }

  initGL()

  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault()
    contextLost = true
  })

  canvas.addEventListener("webglcontextrestored", () => {
    contextLost = false
    generation++
    initGL()
    texture = null
    hatch = hatchImage ? hatchTexture() : null
    if (shownUrl) {
      reload(shownUrl)
    }
  })

  let hatchImage = null
  let hatch = null
  fetch("/map/hatch.webp").then(response => response.ok ? response.blob() : Promise.reject(new Error(`/map/hatch.webp: ${response.status}`))).then(blob => createImageBitmap(blob, { colorSpaceConversion: "none" })).then(image => {
    hatchImage = image
    if (!contextLost) {
      hatch = hatchTexture()
    }
  })

  function hatchTexture() {
    const result = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, result)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hatchImage)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return result
  }

  async function reload(url) {
    const bitmap = await decode(url)
    if (shownUrl !== url || contextLost) {
      bitmap.close()
      return
    }
    texture = upload(bitmap)
    needsDraw = true
  }

  async function fitToTexture(source) {
    const limit = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), LOW_MEMORY ? LOW_MEMORY_SIZE : Infinity)
    if (source.width <= limit && source.height <= limit) {
      return source
    }
    const scale = Math.min(limit / source.width, limit / source.height)
    const resized = await createImageBitmap(source, { resizeWidth: Math.floor(source.width * scale), resizeHeight: Math.floor(source.height * scale), resizeQuality: "high" })
    source.close()
    return resized
  }

  async function decode(url, onProgress) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${url}: ${response.status}`)
    }
    const total = Number(response.headers.get("Content-Length")) || 0
    let blob
    if (onProgress && total && response.body) {
      const reader = response.body.getReader()
      const chunks = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        chunks.push(value)
        received += value.length
        onProgress(received / total)
      }
      blob = new Blob(chunks, { type: response.headers.get("Content-Type") || "image/avif" })
    } else {
      blob = await response.blob()
    }
    onProgress?.(1)
    const bitmap = await fitToTexture(await createImageBitmap(blob))
    sources.set(bitmap, url)
    return bitmap
  }

  function upload(image) {
    const result = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, result)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    if (anisotropy) {
      gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
    }
    sources.set(result, { url: sources.get(image), generation })
    image.close()
    return result
  }

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.round(viewSize[0] * scale)
    const height = Math.round(viewSize[1] * scale)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      needsDraw = true
    }
  }

  function draw(now) {
    if (destroyed) {
      return
    }
    requestAnimationFrame(draw)
    const dt = Math.min((now - lastFrame) / 1000, 0.1)
    lastFrame = now
    if (!pointers.size && (spin.yaw || spin.pitch)) {
      look(spin.yaw * dt, spin.pitch * dt)
      const decay = Math.exp(-dt * SPIN_DECAY)
      spin = Math.hypot(spin.yaw, spin.pitch) * decay < SPIN_STOP ? { yaw: 0, pitch: 0 } : { yaw: spin.yaw * decay, pitch: spin.pitch * decay }
    }
    resize()
    if (contextLost || !needsDraw || !texture || !canvas.width) {
      return
    }
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uniforms.panorama, 0)
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    gl.uniform1f(uniforms.yaw, view.yaw)
    gl.uniform1f(uniforms.pitch, view.pitch)
    gl.uniform1f(uniforms.tanHalf, Math.tan(view.fov * Math.PI / 360))
    const reveal = 1 - (1 - Math.min((now - revealStart) / 1000 / REVEAL_SECONDS, 1)) ** 2
    gl.uniform1f(uniforms.reveal, reveal)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, hatch)
    gl.uniform1i(uniforms.hatch, 1)
    gl.uniform1i(uniforms.hasHatch, hatch ? 1 : 0)
    gl.uniform1f(uniforms.hatchSize, HATCH_SCREEN_PX * canvas.width / Math.max(viewSize[0], 1))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    onHeading?.(((view.yaw * 180 / Math.PI) % 360 + 360) % 360, view)
    needsDraw = reveal < 1
    if (!needsDraw) {
      revealed?.()
      revealed = null
    }
  }

  function look(deltaYaw, deltaPitch) {
    view.yaw += deltaYaw
    view.pitch = Math.max(-maxPitch, Math.min(maxPitch, view.pitch + deltaPitch))
    needsDraw = true
  }

  function zoom(factor) {
    view.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, view.fov * factor))
    needsDraw = true
  }

  const pointers = new Map()
  let pinchDistance = 0

  function pinchSpan() {
    const [a, b] = Array.from(pointers.values())
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  canvas.addEventListener("pointerdown", event => {
    if (!controls.pan && !controls.zoom) {
      return
    }
    canvas.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    spin = { yaw: 0, pitch: 0 }
    lastMove = performance.now()
    canvas.classList.toggle("dragging", controls.pan)
    if (pointers.size === 2) {
      pinchDistance = pinchSpan()
    }
  })

  canvas.addEventListener("pointermove", event => {
    const previous = pointers.get(event.pointerId)
    if (!previous) {
      return
    }
    const current = { x: event.clientX, y: event.clientY }
    pointers.set(event.pointerId, current)
    if (pointers.size === 2) {
      const span = pinchSpan()
      if (controls.zoom) {
        zoom(pinchDistance / span)
      }
      pinchDistance = span
      return
    }
    if (!controls.pan) {
      return
    }
    const step = 2 * Math.tan(view.fov * Math.PI / 360) / Math.max(Math.min(viewSize[0], viewSize[1]), 1)
    const deltaYaw = -(current.x - previous.x) * step, deltaPitch = (current.y - previous.y) * step
    look(deltaYaw, deltaPitch)
    const time = performance.now()
    const elapsed = (time - lastMove) / 1000
    if (elapsed > 0) {
      const blend = Math.min(elapsed / 0.05, 1)
      spin = { yaw: spin.yaw + (deltaYaw / elapsed - spin.yaw) * blend, pitch: spin.pitch + (deltaPitch / elapsed - spin.pitch) * blend }
      const speed = Math.hypot(spin.yaw, spin.pitch)
      if (speed > SPIN_MAX) {
        spin = { yaw: spin.yaw * SPIN_MAX / speed, pitch: spin.pitch * SPIN_MAX / speed }
      }
      lastMove = time
    }
  })

  function endPointer(event) {
    const wasPinch = pointers.size > 1
    pointers.delete(event.pointerId)
    if (wasPinch || performance.now() - lastMove > SPIN_HOLD_MS) {
      spin = { yaw: 0, pitch: 0 }
    }
    lastMove = performance.now()
    if (!pointers.size) {
      canvas.classList.remove("dragging")
    }
  }

  canvas.addEventListener("pointerup", endPointer)
  canvas.addEventListener("pointercancel", endPointer)

  canvas.addEventListener("wheel", event => {
    event.preventDefault()
    if (controls.zoom) {
      zoom(Math.exp(event.deltaY * 0.001))
    }
  }, { passive: false })

  window.addEventListener("keydown", event => {
    if (!active || event.target.closest?.("input, textarea")) {
      return
    }
    const step = 2 * Math.PI / 180
    if (controls.pan && event.key === "ArrowLeft") {
      look(-step, 0)
    } else if (controls.pan && event.key === "ArrowRight") {
      look(step, 0)
    } else if (controls.pan && event.key === "ArrowUp") {
      look(0, step)
    } else if (controls.pan && event.key === "ArrowDown") {
      look(0, -step)
    } else if (controls.zoom && (event.key === "+" || event.key === "=")) {
      zoom(0.9)
    } else if (controls.zoom && event.key === "-") {
      zoom(1 / 0.9)
    }
  }, { signal: teardown.signal })

  requestAnimationFrame(draw)

  return {
    destroy() {
      destroyed = true
      sizer.disconnect()
      teardown.abort()
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    },
    decode,
    upload,
    present(next, yaw, pitch = 0) {
      if (texture) {
        gl.deleteTexture(texture)
      }
      const source = sources.get(next)
      shownUrl = source?.url ?? null
      texture = source && source.generation !== generation ? null : next
      if (!texture && shownUrl) {
        reload(shownUrl)
      }
      view.yaw = yaw
      view.pitch = pitch
      view.fov = 75
      spin = { yaw: 0, pitch: 0 }
      revealStart = performance.now()
      needsDraw = true
      revealed?.()
      return new Promise(resolve => revealed = resolve)
    },
    discard(unused) {
      gl.deleteTexture(unused)
    },
    setActive(value) {
      active = value
    },
    setControls({ pan, zoom: zooming }) {
      controls = { pan, zoom: zooming }
      spin = { yaw: 0, pitch: 0 }
      pointers.clear()
      canvas.classList.remove("dragging")
      canvas.classList.toggle("locked", !pan)
    }
  }
}
