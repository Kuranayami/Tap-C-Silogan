import { Router } from 'express'
import { loginHandler, requireCashier, revokeToken } from '../middleware/cashierAuth.js'
import { getOrders, updateOrder, cancelOrder } from '../controllers/orderController.js'

const router = Router()

router.post('/login', loginHandler)
router.post('/logout', requireCashier, revokeToken)
router.get('/orders', requireCashier, getOrders)
router.patch('/orders/:id', requireCashier, updateOrder)
router.patch('/orders/:id/cancel', requireCashier, cancelOrder)

export default router
