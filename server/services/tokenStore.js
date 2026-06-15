import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

class TokenStore {
  constructor(filePath) {
    this.filePath = join(__dirname, filePath)
    this.tokens = new Map()
    this.load()
  }

  load() {
    if (existsSync(this.filePath)) {
      try {
        this.tokens = new Map(JSON.parse(readFileSync(this.filePath, 'utf-8')))
      } catch { this.tokens = new Map() }
    }
  }

  save() {
    writeFileSync(this.filePath, JSON.stringify([...this.tokens]), 'utf-8')
  }

  generate(id) {
    const token = randomBytes(32).toString('hex')
    this.tokens.set(token, String(id))
    this.save()
    return token
  }

  lookup(token) {
    return this.tokens.get(token) || null
  }

  revoke(token) {
    this.tokens.delete(token)
    this.save()
  }
}

export const riderTokens = new TokenStore('../data/rider_tokens.json')
export const cashierTokens = new TokenStore('../data/cashier_tokens.json')
export const restaurantTokens = new TokenStore('../data/restaurant_tokens.json')
