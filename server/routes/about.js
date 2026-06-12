import { Router } from 'express'
import multer from 'multer'
import { getImages, uploadImage, deleteImage } from '../controllers/aboutController.js'
import { requireAdmin } from '../middleware/auth.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()
router.get('/', getImages)
router.post('/', requireAdmin, upload.single('image'), uploadImage)
router.delete('/:id', requireAdmin, deleteImage)

export default router
