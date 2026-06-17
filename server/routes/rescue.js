import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { requireRider } from '../middleware/riderAuth.js'
import {
  getRescueHoldsHandler, getRescueLogsHandler, getRescueStatsHandler,
  getNotificationPrefsHandler, updateNotificationPrefsHandler,
  updateDriverLocationHandler, getDriverLocationHandler,
  forceRescueHoldHandler, claimRescueMatchHandler,
} from '../controllers/rescueController.js'

const router = Router()

router.get('/holds', requireAdmin, getRescueHoldsHandler)
router.get('/logs', requireAdmin, getRescueLogsHandler)
router.get('/stats', requireAdmin, getRescueStatsHandler)
router.post('/holds', requireAdmin, forceRescueHoldHandler)
router.post('/matches', requireAdmin, claimRescueMatchHandler)

router.post('/location', requireRider, updateDriverLocationHandler)
router.get('/location/:order_id', getDriverLocationHandler)

router.get('/notifications', requireAdmin, getNotificationPrefsHandler)
router.patch('/notifications', requireAdmin, updateNotificationPrefsHandler)

export default router
