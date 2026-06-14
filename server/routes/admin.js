import { Router } from 'express'
import { getUsers, updateUserStatus, deleteUser, getRiders, updateRiderStatus, deleteRider } from '../controllers/adminController.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/users', requireAdmin, getUsers)
router.patch('/users/:id/status', requireAdmin, updateUserStatus)
router.delete('/users/:id', requireAdmin, deleteUser)

router.get('/riders', requireAdmin, getRiders)
router.patch('/riders/:id/status', requireAdmin, updateRiderStatus)
router.delete('/riders/:id', requireAdmin, deleteRider)

export default router
