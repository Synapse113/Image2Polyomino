export function rad2Deg(rad) {
  return rad * (180 / Math.PI);
}

export function deg2Rad(deg) {
  return deg * (Math.PI / 180);
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
