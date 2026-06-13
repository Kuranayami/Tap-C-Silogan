import { Router } from 'express'
import { requestOtp, verifyOtpHandler, googleAuth, getProfile } from '../controllers/authController.js'

const router = Router()

router.post('/otp/send', requestOtp)
router.post('/otp/verify', verifyOtpHandler)
router.post('/google', googleAuth)
router.get('/profile', getProfile)
router.get('/test', (req, res) => { try { res.json({ ok: true }) } catch (e) { res.status(500).json({ e: e.message }) } })

export default router
