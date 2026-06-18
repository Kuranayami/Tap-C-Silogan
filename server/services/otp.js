import { randomInt } from 'crypto'
import { supabase, hasSupabase } from './supabase.js'
import { sendSms } from './sms.js'

const OTP_LENGTH = 6
const OTP_TTL_MIN = 5
const MAX_ATTEMPTS = 5

async function sendEmailViaSendGrid(to, subject, html) {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) return false

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.EMAIL_FROM },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[SENDGRID] HTTP ${res.status}: ${body}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[SENDGRID] Network error:', err.message)
    return false
  }
}

export function generateOtpCode() {
  const num = randomInt(0, 999999)
  return String(num).padStart(OTP_LENGTH, '0')
}

export function getExpiry() {
  return new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString()
}

export async function sendOtp(identifier, channel, purpose = 'login') {
  if (channel === 'email' && !process.env.EMAIL_FROM) {
    console.warn('[OTP] EMAIL_FROM not set in .env — skipping email send')
    return { message: 'OTP would be sent but email is not configured', ttl_min: OTP_TTL_MIN }
  }
  const otpCode = generateOtpCode()
  const expiresAt = getExpiry()

  const store = { otpCode, expiresAt, attempts: 0 }

  if (hasSupabase) {
    const { error } = await supabase.from('otp_verifications').insert({
      identifier, channel, otp_code: otpCode, purpose,
      max_attempts: MAX_ATTEMPTS, expires_at: expiresAt,
    })
    if (error) {
      console.warn('Supabase OTP insert failed, using in-memory:', error.message)
      otpStore.set(identifier + ':' + purpose, store)
    }
  } else {
    otpStore.set(identifier + ':' + purpose, store)
  }

  console.log(`[OTP:${channel.toUpperCase()}] To ${identifier}: Your code is ${otpCode}. Valid for ${OTP_TTL_MIN} min.`)

  if (channel === 'sms' && !identifier.includes('@')) {
    const msg = `Your TAP-C Silogan verification code is ${otpCode}. Valid for ${OTP_TTL_MIN} minutes.`
    sendSms(identifier, msg)
      .then(sent => console.log(sent ? `[SMS] Sent OTP to ${identifier}` : `[SMS] Failed to send to ${identifier}`))
      .catch(err => console.error('[SMS] Unhandled error:', err))
  }

  if (channel === 'email' && identifier.includes('@')) {
    const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a2e;border-radius:12px;text-align:center">
      <h2 style="color:#f97316;margin:0 0 16px">TAP-C Silogan</h2>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px">Your verification code</p>
      <div style="background:#09090b;border-radius:8px;padding:16px;margin:0 0 16px;letter-spacing:8px;font-size:32px;font-weight:bold;color:#f97316">${otpCode}</div>
      <p style="color:#71717a;font-size:12px;margin:0">Expires in ${OTP_TTL_MIN} minutes</p>
    </div>`
    sendEmailViaSendGrid(identifier, 'Your TAP-C Silogan verification code', html)
      .then(sent => console.log(sent ? `[EMAIL] Sent OTP to ${identifier}` : `[EMAIL] Failed to send to ${identifier}`))
      .catch(err => console.error('[EMAIL] Unhandled error:', err))
  }

  return { message: 'OTP sent', ttl_min: OTP_TTL_MIN }
}

export async function verifyOtp(identifier, otpCode, purpose = 'login') {
  if (hasSupabase) {
    const { data: rows, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('identifier', identifier)
      .eq('purpose', purpose)
      .is('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('Supabase OTP lookup failed, using in-memory:', error.message)
      return verifyOtpInMemory(identifier + ':' + purpose, otpCode)
    }

    if (!rows || rows.length === 0) {
      const inMem = verifyOtpInMemory(identifier + ':' + purpose, otpCode)
      if (inMem?.verified) return inMem
      throw new Error('OTP verification failed.')
    }

    const record = rows[0]

    if (record.attempts >= record.max_attempts) {
      throw new Error('OTP verification failed.')
    }

    if (record.otp_code !== otpCode) {
      await supabase
        .from('otp_verifications')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id)
      throw new Error('OTP verification failed.')
    }

    await supabase
      .from('otp_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', record.id)

    return { verified: true, channel: record.channel }
  }

  return verifyOtpInMemory(identifier + ':' + purpose, otpCode)
}

function verifyOtpInMemory(key, otpCode) {
  const record = otpStore.get(key)
  if (!record) throw new Error('OTP verification failed.')
  if (new Date(record.expiresAt) < new Date()) throw new Error('OTP verification failed.')
  if (record.attempts >= MAX_ATTEMPTS) throw new Error('OTP verification failed.')
  if (record.otpCode !== otpCode) {
    record.attempts++
    throw new Error('OTP verification failed.')
  }
  otpStore.delete(key)
  return { verified: true, channel: record.channel || 'sms' }
}

const otpStore = new Map()
