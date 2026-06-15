import { Router } from 'express'
import multer from 'multer'
import { getUsers, updateUserStatus, deleteUser, getRiders, updateRiderStatus, deleteRider, createRider, getRestaurants, createRestaurant, deleteRestaurant } from '../controllers/adminController.js'
import { requireAdmin } from '../middleware/auth.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const router = Router()

router.get('/users', requireAdmin, getUsers)
router.patch('/users/:id/status', requireAdmin, updateUserStatus)
router.delete('/users/:id', requireAdmin, deleteUser)

router.get('/riders', requireAdmin, getRiders)
router.post('/riders', requireAdmin, upload.single('avatar'), createRider)
router.patch('/riders/:id/status', requireAdmin, updateRiderStatus)
router.delete('/riders/:id', requireAdmin, deleteRider)

router.get('/restaurants', requireAdmin, getRestaurants)
router.post('/restaurants', requireAdmin, createRestaurant)
router.delete('/restaurants/:id', requireAdmin, deleteRestaurant)

export default router
