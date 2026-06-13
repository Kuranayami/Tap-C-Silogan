import { randomInt } from 'crypto'
import { supabase, hasSupabase } from './supabase.js'

const OTP_LENGTH = 6
const OTP_TTL_MIN = 5
const MAX_ATTEMPTS = 5

let _transporter = null

async function getTransporter() {
  if (_transporter) return _transporter
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null
  try {
    const { createTransport } = await import('nodemailer')
    _transporter = createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    })
  } catch (err) {
    console.error('[EMAIL] Failed to load nodemailer:', err.message)
  }
  return _transporter
}

export function generateOtpCode() {
  const num = randomInt(0, 999999)
  return String(num).padStart(OTP_LENGTH, '0')
}

export function getExpiry() {
  return new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString()
}

export async function sendOtp(identifier, channel, purpose = 'login') {
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

  const transporter = await getTransporter()
  if (channel === 'email' && transporter && identifier.includes('@')) {
    transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: identifier,
      subject: 'Your TAP-C Silogan verification code',
      text: `Your verification code is: ${otpCode}\n\nThis code expires in ${OTP_TTL_MIN} minutes.\n\nIf you did not request this, please ignore this email.`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a2e;border-radius:12px;text-align:center">
        <h2 style="color:#f97316;margin:0 0 16px">TAP-C Silogan</h2>
        <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px">Your verification code</p>
        <div style="background:#09090b;border-radius:8px;padding:16px;margin:0 0 16px;letter-spacing:8px;font-size:32px;font-weight:bold;color:#f97316">${otpCode}</div>
        <p style="color:#71717a;font-size:12px;margin:0">Expires in ${OTP_TTL_MIN} minutes</p>
      </div>`,
    }).then(() => {
      console.log(`[EMAIL] Sent OTP to ${identifier}`)
    }).catch(err => {
      console.error(`[EMAIL] Failed to send to ${identifier}:`, err.message)
    })
  }

  return { message: 'OTP sent', ttl_min: OTP_TTL_MIN, emailConfigured: !!transporter }
}

export async function verifyOtp(identifier, otpCode, purpose = 'login') {
  if (hasSupabase) {
    const { data: rows, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('identifier', identifier)
      .eq('purpose', purpose)
      .eq('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('Supabase OTP lookup failed, using in-memory:', error.message)
      return verifyOtpInMemory(identifier + ':' + purpose, otpCode)
    }

    if (!rows || rows.length === 0) {
      throw new Error('No valid OTP found. Request a new one.')
    }

    const record = rows[0]

    if (record.attempts >= record.max_attempts) {
      throw new Error('Too many failed attempts. Request a new OTP.')
    }

    if (record.otp_code !== otpCode) {
      await supabase
        .from('otp_verifications')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id)
      throw new Error('Invalid OTP code.')
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
  if (!record) throw new Error('No valid OTP found. Request a new one.')
  if (new Date(record.expiresAt) < new Date()) throw new Error('OTP has expired.')
  if (record.attempts >= MAX_ATTEMPTS) throw new Error('Too many failed attempts. Request a new OTP.')
  if (record.otpCode !== otpCode) {
    record.attempts++
    throw new Error('Invalid OTP code.')
  }
  otpStore.delete(key)
  return { verified: true, channel: record.channel || 'sms' }
}

const otpStore = new Map()
