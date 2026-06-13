import { Router } from 'express'
import { placeOrder, getOrders, updateOrder, removeOrder, trackOrder, cancelOrder } from '../controllers/orderController.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireRider } from '../middleware/riderAuth.js'

const router = Router()
router.post('/', placeOrder)
router.get('/', requireAdmin, getOrders)
router.patch('/:id', requireAdmin, updateOrder)
router.delete('/:id', requireAdmin, removeOrder)
router.get('/track/:contact', trackOrder)
router.patch('/:id/cancel', requireAdmin, cancelOrder)
router.post('/:id/cancel', requireRider, cancelOrder)

export default router
