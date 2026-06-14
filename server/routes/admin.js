import { Router } from 'express'
import { getUsers, updateUserStatus, deleteUser } from '../controllers/adminController.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/users', requireAdmin, getUsers)
router.patch('/users/:id/status', requireAdmin, updateUserStatus)
router.delete('/users/:id', requireAdmin, deleteUser)

export default router
