// matches COLUMNS in tools/depth/views.py
const COLUMNS = 512
export const MAX_PITCH = 15 * Math.PI / 180

export function pickView(ranges, random) {
  const spans = ranges?.length ? ranges : [0, COLUMNS]
  let total = 0
  for (let n = 0; n < spans.length; n += 2) {
    total += spans[n + 1] - spans[n]
  }
  let offset = random() * total
  let column = spans[0]
  for (let n = 0; n < spans.length; n += 2) {
    const length = spans[n + 1] - spans[n]
    if (offset < length) {
      column = spans[n] + offset
      break
    }
    offset -= length
  }
  return { yaw: (column / COLUMNS - 0.5) * 2 * Math.PI, pitch: (random() * 2 - 1) * MAX_PITCH }
}
