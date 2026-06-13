import { Router } from 'express'
import {
  loginRider,
  listReadyOrders,
  claimOrderHandler,
  myActiveOrders,
  completeDelivery,
  setStatus,
  getRiderProfileHandler,
  riderStatsHandler,
  updateKitchen,
} from '../controllers/riderController.js'
import { requireRider } from '../middleware/riderAuth.js'

const router = Router()

router.post('/login', loginRider)

router.get('/ready-orders', requireRider, listReadyOrders)
router.post('/claim', requireRider, claimOrderHandler)
router.get('/my-orders', requireRider, myActiveOrders)
router.post('/deliver', requireRider, completeDelivery)
router.post('/status', requireRider, setStatus)
router.get('/profile', requireRider, getRiderProfileHandler)
router.get('/stats', riderStatsHandler)
router.post('/kitchen', requireRider, updateKitchen)

export default router
