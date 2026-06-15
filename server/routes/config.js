import { Router } from 'express'
import multer from 'multer'
import { getConfigHandler, updateHeroImage, deleteHeroImage, updateHeroDish, updateTestimonials, submitRating, getRatingsHandler, updateDeliveryFeeHandler } from '../controllers/configController.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireCashier } from '../middleware/cashierAuth.js'

const authAdminOrCashier = (req, res, next) => {
  requireAdmin(req, res, (adminErr) => {
    if (!adminErr) return next()
    requireCashier(req, res, next)
  })
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()
router.get('/', getConfigHandler)
router.put('/hero', requireAdmin, upload.single('image'), updateHeroImage)
router.delete('/hero', requireAdmin, deleteHeroImage)
router.patch('/hero/dish', requireAdmin, updateHeroDish)
router.patch('/testimonials', requireAdmin, updateTestimonials)
router.post('/ratings', submitRating)
router.get('/ratings', getRatingsHandler)
router.patch('/delivery-fee', authAdminOrCashier, updateDeliveryFeeHandler)

export default router
