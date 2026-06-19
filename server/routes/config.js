import { Router } from 'express'
import multer from 'multer'
import { getConfigHandler, updateHeroImage, deleteHeroImage, updateHeroDish, updateTestimonials, submitRating, getRatingsHandler, deleteRating, updateDeliveryFeeHandler, uploadZoneImage, deleteZoneImage, uploadZoneKml, deleteZoneKml } from '../controllers/configController.js'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { requireAdmin } from '../middleware/auth.js'
import { requireCashier } from '../middleware/cashierAuth.js'

const __dirname2 = dirname(fileURLToPath(import.meta.url))
const TOKENS_FILE2 = join(__dirname2, '../data/admin_tokens.json')
let _adminTokens = null
function getAdminTokens() {
  if (!_adminTokens && existsSync(TOKENS_FILE2)) {
    try { _adminTokens = new Set(JSON.parse(readFileSync(TOKENS_FILE2, 'utf-8'))) } catch {}
  }
  return _adminTokens || new Set()
}
setInterval(() => { _adminTokens = null }, 30000)

const authAdminOrCashier = (req, res, next) => {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ') && getAdminTokens().has(header.slice(7))) return next()
  return requireCashier(req, res, next)
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()
router.get('/', getConfigHandler)
router.put('/hero', requireAdmin, upload.single('image'), updateHeroImage)
router.delete('/hero', requireAdmin, deleteHeroImage)
router.patch('/hero/dish', requireAdmin, updateHeroDish)
router.patch('/testimonials', requireAdmin, updateTestimonials)
router.post('/ratings', submitRating)
router.delete('/ratings/:name', requireAdmin, deleteRating)
router.get('/ratings', getRatingsHandler)
router.patch('/delivery-fee', authAdminOrCashier, updateDeliveryFeeHandler)
router.put('/zone', requireAdmin, upload.single('image'), uploadZoneImage)
router.delete('/zone', requireAdmin, deleteZoneImage)
router.put('/zone/kml', requireAdmin, upload.single('kml'), uploadZoneKml)
router.delete('/zone/kml', requireAdmin, deleteZoneKml)

export default router
