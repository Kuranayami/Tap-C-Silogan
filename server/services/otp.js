import { randomInt } from 'crypto'
import { supabase, hasSupabase } from './supabase.js'

const OTP_LENGTH = 6
const OTP_TTL_MIN = 5
const MAX_ATTEMPTS = 5

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

  if (hasSupabase) {
    const { error } = await supabase.from('otp_verifications').insert({
      identifier,
      channel,
      otp_code: otpCode,
      purpose,
      max_attempts: MAX_ATTEMPTS,
      expires_at: expiresAt,
    })
    if (error) throw new Error('Failed to store OTP: ' + error.message)
  } else {
    otpStore.set(identifier + ':' + purpose, { otpCode, expiresAt, attempts: 0 })
  }

  if (channel === 'sms') {
    console.log(`[OTP:SMS] To ${identifier}: Your code is ${otpCode}. Valid for ${OTP_TTL_MIN} min.`)
  } else if (channel === 'email') {
    console.log(`[OTP:EMAIL] To ${identifier}: Your code is ${otpCode}. Valid for ${OTP_TTL_MIN} min.`)
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
      .eq('verified_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw new Error('OTP lookup failed: ' + error.message)

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

  // In-memory fallback
  const record = otpStore.get(identifier + ':' + purpose)
  if (!record) throw new Error('No valid OTP found. Request a new one.')
  if (new Date(record.expiresAt) < new Date()) throw new Error('OTP has expired.')
  if (record.attempts >= MAX_ATTEMPTS) throw new Error('Too many failed attempts. Request a new OTP.')
  if (record.otpCode !== otpCode) {
    record.attempts++
    throw new Error('Invalid OTP code.')
  }
  otpStore.delete(identifier + ':' + purpose)
  return { verified: true, channel: record.channel || 'sms' }
}

const otpStore = new Map()
