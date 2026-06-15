import { randomUUID } from 'crypto'
import { sendOtp, verifyOtp } from '../services/otp.js'
import { supabase, hasSupabase } from '../services/supabase.js'
import { storeToken as storeUserToken } from '../middleware/userAuth.js'
import { saveFile } from '../services/storage.js'

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

    if (hasSupabase) {
      if (phone) {
        const { data: byPhone } = await supabase
          .from('users')
          .select('*')
          .eq('phone', identifier)
          .maybeSingle()

        if (byPhone) {
          user = byPhone
        } else if (email) {
          const cleanEmail = email.toLowerCase().trim()
          const { data: byEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle()

          if (byEmail) {
            await supabase.from('users').update({ phone: identifier }).eq('id', byEmail.id)
            user = { ...byEmail, phone: identifier }
          }
        }
      } else if (email) {
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', identifier)
          .maybeSingle()

        if (byEmail) {
          user = byEmail
        }
      }

      if (!user) {
        const insertData = phone
          ? { phone: identifier, name: 'Customer', is_verified: true }
          : { email: identifier, name: 'Customer', is_verified: true }

        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert(insertData)
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
      user: user ? { id: user.id, name: user.name, phone: user.phone ?? null, email: user.email, avatar_url: user.avatar_url ?? null, age: user.age ?? null, gender: user.gender ?? null, maps_link: user.maps_link ?? null, address: user.address ?? null } : { id: identifier },
    })
  } catch (err) {
    console.error('verifyOtpHandler error:', err)
    res.status(401).json({ error: 'OTP verification failed' })
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
      const safeGoogleId = google_id.replace(/[^a-zA-Z0-9._\-]/g, '')
      const safeEmail = (email || '').toLowerCase().trim().replace(/[^a-zA-Z0-9.@_\-]/g, '')
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .or(`google_id.eq.${safeGoogleId},email.eq.${safeEmail}`)
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
        ? { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url ?? null, phone: user.phone ?? null, age: user.age ?? null, gender: user.gender ?? null, maps_link: user.maps_link ?? null, address: user.address ?? null }
        : { google_id, name, email },
    })
  } catch (err) {
    console.error('googleAuth error:', err)
    res.status(500).json({ error: 'Google authentication failed' })
  }
}

export async function testEmail(req, res) {
  res.json({
    sendgridKey: process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET',
  })
}

export async function getProfile(req, res) {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })

    if (hasSupabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) return res.status(404).json({ error: 'User not found' })
      return res.json({
        id: data.id, name: data.name, phone: data.phone ?? null, email: data.email,
        avatar_url: data.avatar_url ?? null, auth_provider: data.auth_provider,
        created_at: data.created_at, name_edited: data.name_edited ?? null,
        age: data.age ?? null, gender: data.gender ?? null, maps_link: data.maps_link ?? null, address: data.address ?? null,
      })
    }

    res.json({ id: userId, name: 'Customer', phone: userId, name_edited: false })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.userId
    const { name, phone, age, gender, maps_link, address } = req.body

    if (hasSupabase) {
      const updates = {}

      if (name && name.trim()) {
        updates.name = name.trim().slice(0, 100)
        let nameEditedColumnExists = true
        const { data: current, error: nameErr } = await supabase
          .from('users')
          .select('name_edited, email, phone')
          .eq('id', userId)
          .maybeSingle()
        if (nameErr && (nameErr.code === 'PGRST204' || nameErr.code === '42703')) {
          nameEditedColumnExists = false
        } else if (current?.name_edited && !req.body.otp_verified) {
          const contact = current.email || (current.phone ? `63${current.phone.replace(/^0/, '')}` : null)
          return res.json({ needs_otp: true, email: current.email, phone: contact })
        }
        if (nameEditedColumnExists) updates.name_edited = true
      }

      if (phone) {
        const { data: phoneUser } = await supabase
          .from('users')
          .select('id, name')
          .eq('phone', phone)
          .neq('id', userId)
          .maybeSingle()
        if (phoneUser) {
          await supabase.from('users').update({ phone: 'f_' + phoneUser.id.slice(0, 12) }).eq('id', phoneUser.id)
        }
        updates.phone = phone
      }
      if (age !== undefined && age !== '') updates.age = parseInt(age, 10)
      if (gender) updates.gender = gender
      if (maps_link !== undefined) {
        if (maps_link && !maps_link.startsWith('http://') && !maps_link.startsWith('https://')) {
          updates.maps_link = 'https://' + maps_link
        } else {
          updates.maps_link = maps_link
        }
      }
      if (address !== undefined) updates.address = address

      if (req.file) {
      const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
      const ext = ALLOWED[req.file.mimetype]
      if (!ext) return res.status(400).json({ error: 'Only JPEG, PNG, or WebP images are allowed' })
        const filename = 'user-avatar-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
        updates.avatar_url = await saveFile(filename, req.file.buffer, req.file.mimetype)
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }

      let { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select('*')
        .maybeSingle()

      if (error && (error.code === 'PGRST204' || error.code === '42703')) {
        let safeUpdates = { ...updates }
        delete safeUpdates.age
        delete safeUpdates.gender
        delete safeUpdates.maps_link
        delete safeUpdates.address
        let result = await supabase
          .from('users')
          .update(safeUpdates)
          .eq('id', userId)
          .select('*')
          .single()
        if (result.error && (result.error.code === 'PGRST204' || result.error.code === '42703')) {
          delete safeUpdates.name_edited
          result = await supabase
            .from('users')
            .update(safeUpdates)
            .eq('id', userId)
            .select('*')
            .single()
        }
        if (result.error) throw result.error
        return res.json({
          id: result.data.id, name: result.data.name, phone: result.data.phone,
          email: result.data.email, avatar_url: result.data.avatar_url,
          age: null, gender: null, maps_link: null, address: null,
          name_edited: updates.name_edited === true ? true : null,
        })
      }

      if (error) throw error
      return res.json({
        id: data.id, name: data.name, phone: data.phone ?? null,
        email: data.email, avatar_url: data.avatar_url ?? null,
        age: data.age ?? null, gender: data.gender ?? null, maps_link: data.maps_link ?? null, address: data.address ?? null,
        name_edited: data.name_edited ?? null,
      })
    }

    res.json({ id: userId, name: req.body.name || '', phone: req.body.phone || '', email: req.body.email || '' })
  } catch (err) {
    console.error('updateProfile error:', err?.message || err, err?.stack || '', 'code:', err?.code, 'details:', err?.details)
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Phone number already in use — delete the duplicate account in Supabase Table Editor first.' })
    }
    res.status(500).json({ error: 'Failed to update profile' })
  }
}
