import { getAboutImages, addAboutImage, removeAboutImage } from './supabase.js'

export function getAllImages() {
  return getAboutImages()
}

export function addImage(item) {
  return addAboutImage(item)
}

export function removeImage(id) {
  return removeAboutImage(id)
}
