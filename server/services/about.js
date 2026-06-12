import { existsSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../data')
const ABOUT_FILE = join(dataDir, 'about.json')

function readJSON(file, fallback) {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {}
  return fallback
}

function writeJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

let inMemoryAbout = readJSON(ABOUT_FILE, [])

export function getAllImages() {
  return [...inMemoryAbout]
}

export function addImage(item) {
  const newItem = { id: `a${Date.now()}`, ...item, order: inMemoryAbout.length }
  inMemoryAbout.push(newItem)
  writeJSON(ABOUT_FILE, inMemoryAbout)
  return newItem
}

export function removeImage(id) {
  const idx = inMemoryAbout.findIndex(i => i.id === id)
  if (idx === -1) return null
  const removed = inMemoryAbout.splice(idx, 1)[0]
  writeJSON(ABOUT_FILE, inMemoryAbout)
  return removed
}
