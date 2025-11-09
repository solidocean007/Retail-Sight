# 🗺️ Auto-Detect Store (Camera Uploads) — Development Roadmap

### 🎯 Goal
Automatically detect which store (account) a user is in **only when they take a live photo using the camera**, not when uploading from their gallery.  
If company accounts are available, suggest the **closest match** based on geolocation and store name.  
If no company accounts exist, show the **top 3 nearby store addresses** using the **Google Maps Places API**.

---

## ✅ Phase 1 — Branch Setup
**Branch Name:** `feature/auto-detect-store`

```bash
git checkout main
git pull origin main
git checkout -b feature/auto-detect-store
