import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadsDir = join(__dirname, '../uploads')
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const BUCKET = 'uploads'

export async function saveFile(filename, buffer, mimetype) {
  if (supabase) {
    const { data, error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType: mimetype,
      upsert: true,
    })
    if (error) {
      console.warn('Supabase Storage upload failed, falling back to local:', error.message)
    } else {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
      return urlData.publicUrl
    }
  }
  writeFileSync(join(uploadsDir, filename), buffer)
  return '/uploads/' + filename
}

export async function deleteFile(url) {
  if (!url) return
  if (supabase && url.includes('/storage/v1/object/public/')) {
    const parts = url.split('/')
    const filename = parts[parts.length - 1]
    await supabase.storage.from(BUCKET).remove([filename])
    return
  }
  const filename = url.replace('/uploads/', '')
  const path = join(uploadsDir, filename)
  if (existsSync(path)) unlinkSync(path)
}
