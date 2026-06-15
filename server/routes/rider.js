import { Router } from 'express'
import multer from 'multer'
import {
  loginRider,
  listReadyOrders,
  claimOrderHandler,
  myActiveOrders,
  completeDelivery,
  cancelDeliveryHandler,
  setStatus,
  getRiderProfileHandler,
  updateRiderProfile,
  riderStatsHandler,
  updateKitchen,
} from '../controllers/riderController.js'
import { requireRider } from '../middleware/riderAuth.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const router = Router()

router.post('/login', loginRider)

router.get('/ready-orders', requireRider, listReadyOrders)
router.post('/claim', requireRider, claimOrderHandler)
router.get('/my-orders', requireRider, myActiveOrders)
router.post('/deliver', requireRider, completeDelivery)
router.post('/cancel', requireRider, cancelDeliveryHandler)
router.post('/status', requireRider, setStatus)
router.get('/profile', requireRider, getRiderProfileHandler)
router.patch('/profile', requireRider, upload.single('avatar'), updateRiderProfile)
router.get('/stats', riderStatsHandler)
router.post('/kitchen', requireRider, updateKitchen)

export default router
