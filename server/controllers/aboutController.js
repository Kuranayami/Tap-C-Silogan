import { getAllImages, addImage, removeImage } from '../services/about.js'

export async function getImages(req, res) {
  try {
    const images = getAllImages()
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
    const image = '/uploads/' + req.file.filename
    const item = addImage({ image })
    res.status(201).json(item)
  } catch (err) {
    console.error('uploadImage error:', err)
    res.status(500).json({ error: 'Failed to upload image' })
  }
}

export async function deleteImage(req, res) {
  try {
    const { id } = req.params
    const item = removeImage(id)
    if (!item) return res.status(404).json({ error: 'Image not found' })
    res.json({ message: 'Image deleted', item })
  } catch (err) {
    console.error('deleteImage error:', err)
    res.status(500).json({ error: 'Failed to delete image' })
  }
}
