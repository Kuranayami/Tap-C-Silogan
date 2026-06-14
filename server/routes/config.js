import { Router } from 'express'
import multer from 'multer'
import { getConfigHandler, updateHeroImage, deleteHeroImage, updateHeroDish, updateTestimonials, submitRating, getRatingsHandler } from '../controllers/configController.js'
import { requireAdmin } from '../middleware/auth.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()
router.get('/', getConfigHandler)
router.put('/hero', requireAdmin, upload.single('image'), updateHeroImage)
router.delete('/hero', requireAdmin, deleteHeroImage)
router.patch('/hero/dish', requireAdmin, updateHeroDish)
router.patch('/testimonials', requireAdmin, updateTestimonials)
router.post('/ratings', submitRating)
router.get('/ratings', getRatingsHandler)

export default router
