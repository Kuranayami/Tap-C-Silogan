import { Router } from 'express'
import multer from 'multer'
import { requireCashier } from '../middleware/cashierAuth.js'
import { loginCashier, registerCashier, getCashiers, deleteCashier, getCashierProfile, updateCashierProfile } from '../controllers/cashierController.js'
import { getOrders, updateOrder, cancelOrder } from '../controllers/orderController.js'
import { requireAdmin } from '../middleware/auth.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const router = Router()

router.post('/login', loginCashier)
router.post('/register', requireAdmin, registerCashier)
router.get('/manage', requireAdmin, getCashiers)
router.delete('/manage/:id', requireAdmin, deleteCashier)
router.get('/profile', requireCashier, getCashierProfile)
router.patch('/profile', requireCashier, upload.single('avatar'), updateCashierProfile)
router.get('/orders', requireCashier, getOrders)
router.patch('/orders/:id', requireCashier, updateOrder)
router.patch('/orders/:id/cancel', requireCashier, cancelOrder)

export default router
