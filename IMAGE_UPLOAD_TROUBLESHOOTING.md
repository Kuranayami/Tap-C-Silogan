# Image Upload Troubleshooting Guide

## 1. Find the Broken URL (Developer Tools)

1. Open the page with the broken image
2. **Right-click the broken image icon → Inspect** (or F12 → Elements tab)
3. In the Elements panel, find the `<img>` tag. Look at the `src` attribute value
4. Copy the `src` URL and paste it into a new browser tab
5. If you get a 404, the file path is wrong. If you get a 403, permissions. If blank/error, server issue.

Alternatively: F12 → Network tab → filter by "img" → refresh → find the failed request (red). Click it to see the full request URL and response.

## 2. Common Causes

### Path Mismatch
- The URL stored in the database does not match where the file actually lives
- The `src` attribute shows `/uploads/abc.jpg` but the file is at `https://api.example.com/uploads/abc.jpg`
- **Check:** Copy the `src` value and open it directly

### Missing Base URL
- The stored path is `/uploads/file.jpg` (relative), but the frontend is on a different domain than the API
- The `imageUrl()` helper must prepend the API base URL
- **Check:** Does the `src` show a full URL (`https://...`) or just a path (`/uploads/...`)?

### Case Sensitivity
- Some servers (Linux, macOS) treat `Image.jpg` and `image.jpg` as different files
- File was saved as `photo.JPG` but the URL references `photo.jpg`
- **Check:** Compare the filename in the URL vs the actual filename on disk

### Server Static File Serving
- The server must `express.static('/uploads')` or equivalent to serve uploaded files
- Without it, `/uploads/file.jpg` returns 404 even if the file exists on disk
- **Check:** Try the URL directly in the browser

### Ephemeral Filesystem
- Some hosting platforms (Render free tier, Heroku, etc.) have ephemeral disks
- Uploaded files are deleted on restart/redeploy
- **Check:** If the image worked briefly then broke after a deploy, this is the cause

### CORS Blocking Image Load
- Images loaded via `<img>` tags are NOT blocked by CORS (unlike fetch/API calls)
- But if the image URL points to a different origin, some browsers may show a blank if the server returns no Content-Type or wrong headers
- **Check:** Network tab response headers should include `Content-Type: image/jpeg`

### File Not Actually Saved
- Upload returns 200 but the file write failed silently (disk full, permissions, etc.)
- **Check:** Does the API endpoint actually write the file? Check server logs.

## 3. Quick Debug Steps

| Step | What to do |
|------|------------|
| 1 | Inspect the `<img>` element → copy `src` URL |
| 2 | Open the `src` URL directly in a new tab |
| 3 | If 404 → path mismatch. If works → check frontend code |
| 4 | Check the Network tab for the image request status |
| 5 | Check server logs for `writeFileSync` or Supabase upload errors |
