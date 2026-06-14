import { Router } from 'express'
import { requireCashier } from '../middleware/cashierAuth.js'
import { loginCashier, registerCashier, getCashiers, deleteCashier } from '../controllers/cashierController.js'
import { getOrders, updateOrder, cancelOrder } from '../controllers/orderController.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.post('/login', loginCashier)
router.post('/register', requireAdmin, registerCashier)
router.get('/manage', requireAdmin, getCashiers)
router.delete('/manage/:id', requireAdmin, deleteCashier)
router.get('/orders', requireCashier, getOrders)
router.patch('/orders/:id', requireCashier, updateOrder)
router.patch('/orders/:id/cancel', requireCashier, cancelOrder)

export default router
