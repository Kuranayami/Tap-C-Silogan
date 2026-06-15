const API_KEY = process.env.SEMAPHORE_API_KEY
const SENDER_NAME = process.env.SEMAPHORE_SENDER_NAME || 'SEMAPHORE'

export async function sendSms(phone, message) {
  if (!API_KEY) {
    console.warn('[SMS] SEMAPHORE_API_KEY not set — SMS not sent')
    return false
  }

  try {
    const res = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: API_KEY,
        number: phone,
        message,
        sendername: SENDER_NAME,
      }),
    })

    const body = await res.json().catch(() => null)
    if (!res.ok) {
      console.error('[SMS] Semaphore error:', res.status, JSON.stringify(body))
      return false
    }

    console.log(`[SMS] Sent to ${phone}: ${body?.[0]?.status || 'OK'}`)
    return true
  } catch (err) {
    console.error('[SMS] Network error:', err.message)
    return false
  }
}
