import { Router } from 'express'
import { requireRestaurant } from '../middleware/restaurantAuth.js'
import { loginRestaurant, getRestaurantOrders, markOrderReady } from '../controllers/restaurantController.js'

const router = Router()

router.post('/login', loginRestaurant)
router.get('/orders', requireRestaurant, getRestaurantOrders)
router.patch('/orders/:id/ready', requireRestaurant, markOrderReady)

export default router