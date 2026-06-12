import { Router } from 'express'
import { placeOrder, getOrders, updateOrder, removeOrder } from '../controllers/orderController.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()
router.post('/', placeOrder)
router.get('/', requireAdmin, getOrders)
router.patch('/:id', requireAdmin, updateOrder)
router.delete('/:id', requireAdmin, removeOrder)

export default router
