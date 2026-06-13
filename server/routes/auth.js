import { Router } from 'express'
import { requestOtp, verifyOtpHandler, googleAuth, getProfile } from '../controllers/authController.js'

const router = Router()

router.post('/otp/send', requestOtp)
router.post('/otp/verify', verifyOtpHandler)
router.post('/google', googleAuth)
router.get('/profile', getProfile)

export default router
