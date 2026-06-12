import { Router } from 'express'
import multer from 'multer'
import { getMenuItems, createMenuItem, editMenuItem, deleteMenuItem } from '../controllers/menuController.js'
import { requireAdmin } from '../middleware/auth.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()
router.get('/', getMenuItems)
router.post('/', requireAdmin, upload.single('image'), createMenuItem)
router.patch('/:id', requireAdmin, upload.single('image'), editMenuItem)
router.delete('/:id', requireAdmin, deleteMenuItem)

export default router
