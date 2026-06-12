import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const BUCKET = 'uploads'

export async function ensureBucket() {
  if (!supabase) { console.warn('Supabase not configured — storage unavailable'); return }
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find(b => b.name === BUCKET)) {
      const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
      if (error) console.warn('Could not create storage bucket:', error.message)
      else console.log('Storage bucket ready:', BUCKET)
    }
  } catch (e) {
    console.warn('Storage bucket check failed:', e.message)
  }
}

async function ensureBucketWithRetry() {
  if (!supabase) return
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error('Cannot create storage bucket "' + BUCKET + '": ' + error.message)
  }
}

export async function saveFile(filename, buffer, mimetype) {
  if (!supabase) throw new Error('Storage not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  const { data, error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType: mimetype,
    upsert: true,
  })
  if (error) {
    if (error.message === 'Not Found' || error.message?.includes('bucket')) {
      await ensureBucketWithRetry()
      const { data: retryData, error: retryError } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
        contentType: mimetype,
        upsert: true,
      })
      if (retryError) throw new Error('Upload failed after bucket check: ' + retryError.message)
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
      return urlData.publicUrl
    }
    throw new Error('Storage upload failed: ' + error.message)
  }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return urlData.publicUrl
}

export async function deleteFile(url) {
  if (!url || !supabase) return
  const parts = url.split('/')
  const filename = parts[parts.length - 1]
  await supabase.storage.from(BUCKET).remove([filename])
}
