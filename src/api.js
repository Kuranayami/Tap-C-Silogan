const BASE = import.meta.env.VITE_API_URL || ''

export function api(path) {
  return BASE + path
}

export function imageUrl(path) {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return BASE + path
}
