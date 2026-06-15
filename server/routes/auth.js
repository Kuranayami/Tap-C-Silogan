import { Router } from 'express'
import multer from 'multer'
import { requestOtp, verifyOtpHandler, googleAuth, getProfile, updateProfile, testEmail } from '../controllers/authController.js'
import { requireUser } from '../middleware/userAuth.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const router = Router()

router.get('/test-email', testEmail)
router.post('/otp/send', requestOtp)
router.post('/otp/verify', verifyOtpHandler)
router.post('/google', googleAuth)
router.get('/profile', requireUser, getProfile)
router.patch('/profile', requireUser, upload.single('avatar'), updateProfile)

export default router
