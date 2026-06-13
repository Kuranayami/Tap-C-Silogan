import { Router } from 'express'
import { requestOtp, verifyOtpHandler, googleAuth, getProfile, testEmail } from '../controllers/authController.js'
import { requireUser } from '../middleware/userAuth.js'

const router = Router()

router.get('/test-email', testEmail)
router.post('/otp/send', requestOtp)
router.post('/otp/verify', verifyOtpHandler)
router.post('/google', googleAuth)
router.get('/profile', requireUser, getProfile)

export default router
