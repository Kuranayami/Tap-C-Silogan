import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { getMenuItems, createMenuItem, editMenuItem, deleteMenuItem } from '../controllers/menuController.js'
import { requireAdmin } from '../middleware/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const ALLOWED_TYPES = Object.keys(MIME_TO_EXT)

const storage = multer.diskStorage({
  destination: join(__dirname, '../uploads'),
  filename(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = MIME_TO_EXT[file.mimetype] || '.bin'
    cb(null, unique + ext)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'))
  },
})

const router = Router()
router.get('/', getMenuItems)
router.post('/', requireAdmin, upload.single('image'), createMenuItem)
router.patch('/:id', requireAdmin, upload.single('image'), editMenuItem)
router.delete('/:id', requireAdmin, deleteMenuItem)

export default router