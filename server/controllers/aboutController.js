import { getAllImages, addImage, removeImage } from '../services/about.js'
import { saveFile, deleteFile } from '../services/storage.js'

const MIME_TO_EXT = {
  'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
  'image/webp': '.webp', 'image/gif': '.gif', 'image/bmp': '.bmp',
}

const ALLOWED_TYPES = Object.keys(MIME_TO_EXT)

export async function getImages(req, res) {
  try {
    const images = await getAllImages()
    res.json(images)
  } catch (err) {
    console.error('getImages error:', err)
    res.status(500).json({ error: 'Failed to fetch images' })
  }
}

export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' })
    }
    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' })
    }
    const ext = MIME_TO_EXT[req.file.mimetype] || '.bin'
    const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
    const image = await saveFile(filename, req.file.buffer, req.file.mimetype)
    const item = await addImage({ image })
    res.status(201).json(item)
  } catch (err) {
    console.error('uploadImage error:', err)
    res.status(500).json({ error: 'Failed to upload image' })
  }
}

export async function deleteImage(req, res) {
  try {
    const { id } = req.params
    const item = await removeImage(id)
    if (!item) return res.status(404).json({ error: 'Image not found' })
    if (item.image) deleteFile(item.image)
    res.json({ message: 'Image deleted', item })
  } catch (err) {
    console.error('deleteImage error:', err)
    res.status(500).json({ error: 'Failed to delete image' })
  }
}
