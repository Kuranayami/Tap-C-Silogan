import { Router } from 'express'
import { placeOrder, getOrders, updateOrder } from '../controllers/orderController.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()
router.post('/', placeOrder)
router.get('/', requireAdmin, getOrders)
router.patch('/:id', requireAdmin, updateOrder)

export default router
