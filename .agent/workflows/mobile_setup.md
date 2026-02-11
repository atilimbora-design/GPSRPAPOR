---
description: Setup and deployment workflow for the Atılım Gıda Request Mobile App
---

# Atılım Gıda Mobile App Setup & Architecture

## 1. Project Structure
- **Framework:** React Native (via Expo)
- **Navigation:** React Navigation (Stack + Bottom Tabs)
- **State Management:** React Context (Auth, Queue) + AsyncStorage
- **Networking:** Axios + Socket.IO Client

## 2. Key Features
### A. Authentication
- Login with Username/Password
- Persist Session Token
- Handle '401 Unauthorized' by logging out

### B. Location Tracking (Critical)
- Use `expo-location`
- Configure Background Location Task
- Send updates to `POST /api/location` every ~30 seconds or significant change

### C. Offline-First Data (Critical)
- **Request Queue:** Intercept failed network requests. If offline, save to AsyncStorage `request_queue`.
- **Sync:** Monitor Network State (`@react-native-community/netinfo`). When online, process queue FIFO.
- **Form Persistence:** Save draft reports locally so data isn't lost if app closes.

### D. Updates (Critical for 45 Phones)
- **OTA Updates:** Use `expo-updates` to push Javascript fixes instantly.
- **Versioning:** Semantic versioning in `app.json`.

## 3. Deployment
- **Build:** `eas build --platform android`
- **Distribution:** Install `.apk` on devices initially.
- **Updates:** `eas update` for non-native changes.

## 4. Environment
- **API URL:** `http://192.168.1.141:3000` (Local Network)
- **Socket URL:** `http://192.168.1.141:3000`

## 5. Next Steps (Immediate)
1. Install dependencies (`navigation`, `axios`, `location`, `socket.io-client`, `netinfo`).
2. Configure `app.json` for Android permissions.
3. specific AndroidManifest modifications (done via Expo Config Plugin).
