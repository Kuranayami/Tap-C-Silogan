import { randomUUID } from 'crypto'
import { sendOtp, verifyOtp } from '../services/otp.js'
import { supabase, hasSupabase } from '../services/supabase.js'
import { storeToken as storeUserToken } from '../middleware/userAuth.js'

function sanitizePhone(raw) {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('63')) d = d.slice(2)
  if (!d.startsWith('0')) d = '0' + d
  return d.slice(0, 11)
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function requestOtp(req, res) {
  try {
    const { phone, email, channel: rawChannel, purpose = 'login' } = req.body

    let identifier, channel

    if (phone) {
      identifier = sanitizePhone(phone)
      if (identifier.length < 10) {
        return res.status(400).json({ error: 'Invalid phone number' })
      }
      channel = rawChannel || 'sms'
    } else if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email address' })
      }
      identifier = email.toLowerCase().trim()
      channel = rawChannel || 'email'
    } else {
      return res.status(400).json({ error: 'Phone or email is required' })
    }

    const result = await sendOtp(identifier, channel, purpose)
    res.json(result)
  } catch (err) {
    console.error('requestOtp error:', err?.message || err, err?.stack || '')
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to send OTP' })
    }
  }
}

export async function verifyOtpHandler(req, res) {
  try {
    const { phone, email, otp_code, purpose = 'login' } = req.body

    if (!otp_code || otp_code.length !== 6) {
      return res.status(400).json({ error: 'A valid 6-digit OTP code is required' })
    }

    const identifier = phone ? sanitizePhone(phone) : email ? email.toLowerCase().trim() : null
    if (!identifier) {
      return res.status(400).json({ error: 'Phone or email is required' })
    }

    const { verified } = await verifyOtp(identifier, otp_code, purpose)
    if (!verified) {
      return res.status(401).json({ error: 'OTP verification failed' })
    }

    let user = null

    if (phone && hasSupabase) {
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('phone', identifier)
        .maybeSingle()

      if (existing) {
        user = existing
      } else {
        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert({ phone: identifier, name: 'Customer', is_verified: true })
          .select()
          .single()

        if (createErr) throw createErr
        user = newUser
      }
    }

    const token = randomUUID()

    if (user) {
      storeUserToken(token, user.id)
    }

    res.json({
      message: 'OTP verified successfully',
      token,
      user: user ? { id: user.id, name: user.name, phone: user.phone, email: user.email } : { id: identifier },
    })
  } catch (err) {
    console.error('verifyOtpHandler error:', err)
    res.status(401).json({ error: err.message || 'OTP verification failed' })
  }
}

export async function googleAuth(req, res) {
  try {
    const { google_id, email, name, avatar_url } = req.body

    if (!google_id) {
      return res.status(400).json({ error: 'google_id is required' })
    }

    let user = null

    if (hasSupabase) {
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .or(`google_id.eq.${google_id},email.eq.${email?.toLowerCase().trim()}`)
        .maybeSingle()

      if (existing) {
        if (!existing.google_id) {
          await supabase.from('users').update({ google_id }).eq('id', existing.id)
        }
        user = { ...existing, google_id }
      } else {
        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert({
            google_id,
            email: email?.toLowerCase().trim(),
            name: name || 'User',
            avatar_url,
            is_verified: true,
            auth_provider: 'google',
          })
          .select()
          .single()

        if (createErr) throw createErr
        user = newUser
      }
    }

    const token = randomUUID()

    if (user) {
      storeUserToken(token, user.id)
    }

    res.json({
      message: 'Google authentication successful',
      token,
      user: user
        ? { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url }
        : { google_id, name, email },
    })
  } catch (err) {
    console.error('googleAuth error:', err)
    res.status(500).json({ error: 'Google authentication failed' })
  }
}

export async function testEmail(req, res) {
  res.json({
    sendgridKey: process.env.SENDGRID_API_KEY ? 'SET (' + process.env.SENDGRID_API_KEY.length + ' chars)' : 'NOT SET',
    emailFrom: process.env.EMAIL_FROM || 'NOT SET',
    nodeVersion: process.version,
  })
}

export async function getProfile(req, res) {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })

    if (hasSupabase) {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, email, avatar_url, auth_provider, created_at, name_edited')
        .eq('id', userId)
        .single()

      if (error) return res.status(404).json({ error: 'User not found' })
      return res.json(data)
    }

    res.json({ id: userId, name: 'Customer', phone: userId, name_edited: false })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.userId
    const { name, otp_verified } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const safeName = name.trim().slice(0, 100)

    if (hasSupabase) {
      const { data: current } = await supabase
        .from('users')
        .select('name_edited, email, phone')
        .eq('id', userId)
        .single()

      if (current?.name_edited && !otp_verified) {
        const contact = current.email || (current.phone ? `63${current.phone.replace(/^0/, '')}` : null)
        return res.json({ needs_otp: true, email: current.email, phone: contact })
      }

      const { data, error } = await supabase
        .from('users')
        .update({ name: safeName, name_edited: true })
        .eq('id', userId)
        .select('id, name, phone, email, name_edited')
        .single()

      if (error) throw error
      return res.json(data)
    }

    res.json({ id: userId, name: safeName, name_edited: true })
  } catch (err) {
    console.error('updateProfile error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
}
