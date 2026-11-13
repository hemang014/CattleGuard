# CattleGuard — Smart Livestock IoT & GPS Geofencing Platform

<div align="center">

![CattleGuard Banner](https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=1200&q=80)

**Next-generation agricultural IoT platform for real-time cattle monitoring, high-precision NEO-6M GPS geofencing, historical route replay, and automated acoustic buzzer deterrents.**

[![React](https://img.shields.io/badge/React-19.3-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-esp32--gps--tracker--4b283-FFA611.svg)](https://firebase.google.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Street_|_Satellite_|_Terrain-199900.svg)](https://leafletjs.com/)

</div>

---

## 🌾 Overview

**CattleGuard** is an agricultural IoT platform designed to pair with solar-powered ESP32 GPS tracking collars. By bridging field hardware (ESP32, u-blox NEO-6M GPS, MOSFET-driven acoustic buzzers) with cloud infrastructure (Firebase Realtime Database), CattleGuard provides ranchers and agricultural faculty with real-time pasture oversight, virtual fencing, historical route playback, and immediate perimeter breach alerts.

---

## 🗺️ Enhanced Map System

The CattleGuard mapping system provides three distinct, high-definition map layers with zero external API key requirements:

| Map Layer | Provider | Tile Endpoint | Purpose & Display |
| :--- | :--- | :--- | :--- |
| **Streets (DEFAULT)** | OpenStreetMap | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | **Default layer.** Displays road names, locality names, village and city labels, college/university campuses, and surrounding road infrastructure. |
| **Satellite + Labels** | Esri World Imagery + Reference Overlay | Base: `ArcGIS/rest/services/World_Imagery/MapServer` <br/> Overlay: `Reference/World_Boundaries_and_Places` + `World_Transportation` | High-resolution satellite imagery with **crisp transparent road and locality overlays**, ensuring geographic landmarks remain clearly identifiable. |
| **Terrain** | OpenTopoMap / SRTM | `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png` | Topographic contours, elevation shading, and geographical terrain features. |

### Professional Map Controls Included:
1. **Location Search:** Integrated OpenStreetMap Nominatim geocoding (search colleges, villages, cities, roads, and landmarks).
2. **Layer Selector:** Smooth instant switching between Streets, Satellite + Labels, and Terrain.
3. **Distance Scale Bar:** Leaflet metric scale (`m` and `km`).
4. **North Arrow Indicator:** Dedicated compass orientation badge.
5. **Marker Legend:** Clear explanation of livestock collar states, geofence center, virtual boundary, and historical route polylines.
6. **Recenter Quick Actions:** Center on Animal GPS or Center on Geofence Centre.
7. **Fullscreen Map Mode:** Instant browser fullscreen toggle for pasture inspection.

---

## 📍 GPS Coordinate Accuracy & Benchmark

CattleGuard enforces strict coordinate integrity:
- **Order of Coordinates:** Leaflet coordinates are strictly provided in `[latitude, longitude]` order.
- **Data Integrity:** Live Firebase mode reads directly from Firebase without substituting fabricated or adjusted coordinates.
- **Benchmark Historical Record:**
  - **Device ID:** `esp32_gps_01`
  - **Latitude:** `23.12213633`
  - **Longitude:** `72.59768517`
  - **Satellites:** `8`
  - **Timestamp:** `2026-10-11T15:31:52Z`
  - **Geographic Location:** Ahmedabad / Gandhinagar corridor (near PDPU / Raysan / Koba Circle).

---

## ⏳ Historical GPS Tracking & Route Playback

Under **Live Tracking &rarr; Historical Playback**, CattleGuard provides an audit interface:

- **Chronological Path Polyline:** Connects all valid historical GPS points from `/devices/esp32_gps_01/history`.
- **Start and End Markers:** Green `START` marker and Dark Green `END` marker.
- **Clickable Waypoints:** Click any historical dot to inspect timestamp, coordinates, satellites, and HDOP.
- **Playback Controller:**
  - `Play` / `Pause`
  - `Step Backward` / `Step Forward`
  - Playback speed options: `1x`, `2x`, `5x`
  - Interactive point scrubber slider (`Point X of Y`)
  - Animated livestock collar marker moving chronologically along the route.
- **Location History Table:**
  - Columns: *Record #*, *Timestamp*, *Latitude*, *Longitude*, *Satellites*, *HDOP*, *Geofence Status*, *Distance from Center*.
  - Sort by time (Newest vs. Oldest).
  - Date and search filtering.
  - **Export CSV** (`esp32_gps_01_history.csv`).

---

## 📡 GPS Quality & HDOP Indicator

CattleGuard includes a dedicated **GPS Quality Indicator** panel:
- **Locked Satellites:** Count of satellites tracked by NEO-6M GPS.
- **HDOP (Horizontal Dilution of Precision):**
  - `< 1.0`: Ideal (Highest positional confidence)
  - `1.0 – 2.0`: Excellent
  - `2.0 – 5.0`: Good
  - `> 5.0`: Poor / Constrained geometry
  - *(Displays `N/A` if HDOP is missing from historical records)*
- **Data Freshness:** Real-time relative age (`Just now`, `14s ago`, `2m ago`).
- **4 Connectivity States:**
  - `ONLINE`: Fresh telemetry within timeout threshold.
  - `OFFLINE`: Stale telemetry exceeding configurable timeout (e.g., 90s).
  - `GPS WAITING`: Collar active but searching for sky lock (satellites < 3 or lat/lon == 0).
  - `NO DATA`: No record received yet from Firebase.

---

## ⚡ Firebase Realtime Database Integration

### Target Firebase Project
- **Project ID:** `esp32-gps-tracker-4b283`
- **Database URL:** `https://esp32-gps-tracker-4b283-default-rtdb.firebaseio.com`

### Database Paths & Schema Contract
| Firebase Path | Fields | Description |
| :--- | :--- | :--- |
| `/devices/esp32_gps_01/latest` | `latitude`, `longitude`, `satellites`, `hdop`, `timestamp`, `outside`, `distanceM` | Live GPS telemetry streamed from collar |
| `/devices/esp32_gps_01/history` | `latitude`, `longitude`, `satellites`, `hdop`, `timestamp`, `outside`, `distanceM` | Chronological GPS log of cattle movements |
| `/geofence` | `centerLat`, `centerLon`, `radiusM`, `updatedAt` | Virtual safe grazing boundary read by ESP32 |
| `/alerts/esp32_gps_01` | `id`, `type`, `deviceId`, `timestamp`, `latitude`, `longitude`, `distanceM`, `outside`, `message` | Incident log of perimeter breaches and returns |

> [!IMPORTANT]
> The `/geofence` path and its field names (`centerLat`, `centerLon`, `radiusM`) are preserved exactly so the ESP32 collar can fetch new boundaries automatically without reflashing.

---

## 🔌 ESP32 Collar Hardware Pinout

```
       +------------------+
       |   ESP32 DevKit   |
       |                  |
       |  GPIO 16 (RX2)   |<------ TX  (u-blox NEO-6M GPS)
       |  GPIO 17 (TX2)   |------> RX  (u-blox NEO-6M GPS)
       |  3.3V / 5V       |------> VCC (NEO-6M GPS)
       |  GND             |------> GND (NEO-6M GPS)
       |                  |
       |  GPIO 18 (PWM)   |------> Gate (N-Channel MOSFET / IRLZ44N)
       |  GND             |------> Source (MOSFET)
       +------------------+           |
                                   Drain
                                      |
                                  (-) Pin
                             +------------------+
                             | 5V Piezo Buzzer  |
                             |      (2.4 kHz)   |
                             +------------------+
                                  (+) Pin
                                      |
                                  +5V / Battery VCC
```

---

## 🎮 Dual-Mode Operating System

CattleGuard features two completely isolated operational modes selectable from the header:

### 1. Live Mode
- **Hardware Integration:** Connects to real ESP32 + NEO-6M collar hardware via Firebase Realtime Database.
- **Database Paths:** Reads `/devices/esp32_gps_01/latest`, `/devices/esp32_gps_01/history`, and `/alerts/esp32_gps_01`.
- **Geofence Control:** Syncs updates directly to `/geofence` (`centerLat`, `centerLon`, `radiusM`).
- **Telemetry Integrity:** Zero fabricated coordinates or synthetic values. Shows `N/A` if telemetry is missing.

### 2. Demo / Simulation Mode
- **Interactive Sandbox:** Full livestock geofencing sandbox requiring zero physical hardware.
- **Strict Data Isolation:** Simulated coordinates and alerts **never touch Firebase**.
- **Interactive Map:** Draggable livestock marker, click-to-move herd, click-to-reposition geofence center, and click-to-set destination.
- **Automated Movement:** Linear interpolation along planned route with configurable speeds (1x, 2x, 5x) and transition-only boundary alerts.
- **Preset Demonstration Scenarios:**
  1. *Herd Inside:* Placed safely within pasture (40% radius).
  2. *Just Outside:* Placed slightly beyond safe boundary (115% radius).
  3. *Far Outside:* Placed significantly beyond safe perimeter (250% radius).
  4. *Return to Safe Zone:* Repositions herd safely inside.
  5. *Custom Scenario:* Configurable coordinates and radii (50m, 100m, 200m, 500m, 1000m, or custom).
- **Multi-Channel Notifications:**
  - *In-App Alert Banners:* High-visibility red warning toasts for exit, emerald badges for safe return.
  - *Browser Desktop Notifications:* Native Web `Notification` API alerts with permission negotiation.
  - *Synthesized Acoustic Alarm:* Web Audio API square-wave piezo buzzer alarm (with mute and volume slider).
- **Simulation Event Log:** Chronological table of boundary crossings and manual adjustments stored in client `localStorage` with instant CSV export.

---

## 🧪 Testing Checklist Verified

- [x] **Demo Test 1 (Inside Zone):** Radius 100m, herd 50m away &rarr; INSIDE, no alert.
- [x] **Demo Test 2 (Outside Zone):** Radius 100m, herd 150m away &rarr; OUTSIDE, in-app toast, desktop notification, acoustic alarm, event logged.
- [x] **Demo Test 3 (Re-entry):** Move herd from outside to inside &rarr; Re-entry chime & notification, status changes to INSIDE.
- [x] **Demo Test 4 (Automatic Movement):** Configured route crossing boundary &rarr; Progressive movement, single transition exit alert.
- [x] **Demo Test 5 (Manual Movement):** Dragged livestock marker across boundary &rarr; Real-time distance update and perimeter detection.
- [x] **Live Test 6 (Firebase Isolation):** Tested demo mode coordinates &rarr; Verified zero writes to Firebase database.
- [x] **Live Test 7 (Geofence Settings):** Changed geofence in Live Mode &rarr; Writes to `/geofence` in Firebase.
- [x] **Live Test 8 (Missing Data):** Handled disconnected state &rarr; Displays `NO_DATA` with no fabricated coordinates.

---

## 🛠️ Quickstart

```bash
# 1. Enter project directory
cd c:\Users\Legion\Desktop\cattleguard

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Production build
npm run build
```

The application will be accessible at **http://127.0.0.1:5173/**.

