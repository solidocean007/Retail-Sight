# 🚀 Displaygram PWA Rollout Plan

This document outlines the steps to transition Displaygram.com from a standard React web app into a full **Progressive Web App (PWA)** — focusing on *offline resilience, installability, and performance* without disrupting rapid development.

---

## 🧭 Stage 1 — Pre-PWA (Current Development)

### 🎯 Goal
Stabilize core business features before introducing caching and service worker complexity.

### ✅ Tasks
- [ ] Finalize **Billing System** (Braintree + Firestore sync)
- [ ] Finish **Company Onboarding Flow** (accounts + products upload)
- [ ] Implement **Supplier Sharing** (sharedWith logic + visibility rules)
- [ ] Add optional **Google Maps Account Creation**
- [ ] Begin planning for **Product/Brand detection** (API or Firebase ML)

### 💡 Notes
At this stage, Displaygram is deployed as a normal SPA:
- Users always load the newest code.
- No service worker or caching yet.
- Perfect for rapid iteration and daily deploys.

---

## 🧭 Stage 2 — PWA Scaffolding Setup (Preparation)

### 🎯 Goal
Lay groundwork for future PWA enablement without activating caching behavior yet.

### ✅ Tasks
- [ ] Add a `public/manifest.json`
  - Set app name, icons, start_url, theme_color, etc.
- [ ] Create `src/serviceWorkerRegistration.ts`
  - Include register/unregister logic.
- [ ] Add placeholder `src/service-worker.ts`
  - Use **network-first** fetch strategy.
- [ ] Update `index.html`:
  ```html
  <link rel="manifest" href="/manifest.json" />
