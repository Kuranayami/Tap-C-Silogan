import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { placeOrder, getOrders, updateOrder, removeOrder, trackOrder, cancelOrder, getMyOrders } from '../controllers/orderController.js'
import { cancelDeliveryHandler } from '../controllers/riderController.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireRider } from '../middleware/riderAuth.js'
import { requireUser } from '../middleware/userAuth.js'

const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many tracking requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const router = Router()
router.post('/', requireUser, placeOrder)
router.get('/', requireAdmin, getOrders)
router.get('/my', requireUser, getMyOrders)
router.patch('/:id', requireAdmin, updateOrder)
router.delete('/:id', requireAdmin, removeOrder)
router.get('/track/:contact', trackLimiter, trackOrder)
router.patch('/:id/cancel', requireAdmin, cancelOrder)
router.post('/:id/cancel', requireRider, (req, res) => {
  req.body = { order_id: req.params.id }
  cancelDeliveryHandler(req, res)
})

export default router
