/**
 * ==============================================================================
 * CattleGuard: Smart Livestock IoT & GPS Geofencing Collar Firmware
 * Team Member 1: IoT & Embedded Hardware Lead
 * Target Hardware: ESP32 DevKit V1 (30-pin) + u-blox NEO-6M GPS + 5V Piezo Buzzer
 * Cloud Backend: Firebase Realtime Database
 * ==============================================================================
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <math.h>

// -----------------------------------------------------------------------------
// Wi-Fi & Firebase Configuration (Replace with your actual network credentials)
// -----------------------------------------------------------------------------
const char* WIFI_SSID       = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD   = "YOUR_WIFI_PASSWORD";

// Firebase Realtime Database Host & Device Credentials (Placeholders)
const char* FIREBASE_HOST   = "esp32-gps-tracker-4b283-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* FIREBASE_AUTH   = "YOUR_FIREBASE_API_KEY_OR_SECRET";
const char* DEVICE_ID       = "esp32_gps_01";

// -----------------------------------------------------------------------------
// Hardware Pin Definitions
// -----------------------------------------------------------------------------
#define GPS_RX_PIN          16  // ESP32 RX2 connects to GPS TX
#define GPS_TX_PIN          17  // ESP32 TX2 connects to GPS RX
#define GPS_BAUDRATE        9600

#define BUZZER_PIN          18  // Gate of N-Channel MOSFET (IRLZ44N) driving 5V Buzzer
#define STATUS_LED_PIN       2  // Built-in ESP32 status LED

// PWM Configuration for Acoustic Deterrent
#define PWM_CHANNEL          0
#define BUZZER_FREQ_HZ    2400  // Optimal resonant frequency for piezo buzzer
#define PWM_RESOLUTION       8

// Earth radius in meters for Haversine distance formula
const double EARTH_RADIUS_METERS = 6371000.0;

// -----------------------------------------------------------------------------
// Global State & Geofence Variables
// -----------------------------------------------------------------------------
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
WiFiClientSecure client;

// Geofence defaults (updated dynamically from Firebase)
double geofenceCenterLat = 23.12213633;
double geofenceCenterLon = 72.59768517;
double geofenceRadiusM   = 100.0;
bool isOutsideBoundary   = false;
double currentDistanceM  = 0.0;

// Non-blocking timers
unsigned long lastTelemetryUploadMs = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 5000;  // 5 seconds

unsigned long lastGeofenceFetchMs = 0;
const unsigned long GEOFENCE_FETCH_INTERVAL_MS = 30000; // 30 seconds

unsigned long lastBuzzerToggleMs = 0;
bool buzzerState = false;

// -----------------------------------------------------------------------------
// Haversine Distance Calculation (Autonomous On-Chip Edge Computing)
// -----------------------------------------------------------------------------
double toRadians(double degrees) {
  return degrees * (M_PI / 180.0);
}

double computeHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
  double dLat = toRadians(lat2 - lat1);
  double dLon = toRadians(lon2 - lon1);

  double a = sin(dLat / 2.0) * sin(dLat / 2.0) +
             cos(toRadians(lat1)) * cos(toRadians(lat2)) *
             sin(dLon / 2.0) * sin(dLon / 2.0);

  double c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
  return EARTH_RADIUS_METERS * c;
}

// -----------------------------------------------------------------------------
// Buzzer Deterrent Controller
// -----------------------------------------------------------------------------
void setBuzzerAlert(bool active) {
  if (active) {
    unsigned long currentMs = millis();
    if (currentMs - lastBuzzerToggleMs >= 250) { // Pulsed warning pattern (250ms on / 250ms off)
      lastBuzzerToggleMs = currentMs;
      buzzerState = !buzzerState;
      if (buzzerState) {
        ledcWrite(PWM_CHANNEL, 180); // ~70% duty cycle
        digitalWrite(STATUS_LED_PIN, HIGH);
      } else {
        ledcWrite(PWM_CHANNEL, 0);
        digitalWrite(STATUS_LED_PIN, LOW);
      }
    }
  } else {
    ledcWrite(PWM_CHANNEL, 0);
    digitalWrite(STATUS_LED_PIN, LOW);
    buzzerState = false;
  }
}

// -----------------------------------------------------------------------------
// Network & HTTP Helper Functions for Firebase RTDB REST API
// -----------------------------------------------------------------------------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
    client.setInsecure(); // Accept Firebase SSL certificates
  } else {
    Serial.println("\n[WiFi] Connection timeout. Operating in autonomous GPS mode.");
  }
}

void syncGeofenceFromFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!client.connect(FIREBASE_HOST, 443)) {
    Serial.println("[Firebase] Failed to connect for geofence read");
    return;
  }

  String url = String("/geofence.json?auth=") + FIREBASE_AUTH;
  client.print(String("GET ") + url + " HTTP/1.1\r\n" +
               "Host: " + FIREBASE_HOST + "\r\n" +
               "Connection: close\r\n\r\n");

  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") break; // Headers finished
  }

  String payload = client.readString();
  client.stop();

  // Basic lightweight JSON extraction without bulky external JSON libraries
  int centerLatIdx = payload.indexOf("\"centerLat\":");
  int centerLonIdx = payload.indexOf("\"centerLon\":");
  int radiusIdx    = payload.indexOf("\"radiusM\":");

  if (centerLatIdx != -1 && centerLonIdx != -1 && radiusIdx != -1) {
    geofenceCenterLat = payload.substring(centerLatIdx + 12, payload.indexOf(',', centerLatIdx)).toDouble();
    geofenceCenterLon = payload.substring(centerLonIdx + 12, payload.indexOf(',', centerLonIdx)).toDouble();
    int endRadiusIdx = payload.indexOf(',', radiusIdx);
    if (endRadiusIdx == -1) endRadiusIdx = payload.indexOf('}', radiusIdx);
    geofenceRadiusM = payload.substring(radiusIdx + 10, endRadiusIdx).toDouble();

    Serial.printf("[Geofence] Synced from Firebase: Lat=%.6f, Lon=%.6f, Radius=%.1fm\n",
                  geofenceCenterLat, geofenceCenterLon, geofenceRadiusM);
  }
}

void pushTelemetryToFirebase(double lat, double lon, int sats, double hdop, double distM, bool outside) {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!client.connect(FIREBASE_HOST, 443)) {
    Serial.println("[Firebase] Telemetry connection failed");
    return;
  }

  // Construct ISO timestamp from GPS if valid, else epoch millis
  char timeBuffer[32];
  if (gps.date.isValid() && gps.time.isValid()) {
    snprintf(timeBuffer, sizeof(timeBuffer), "%04d-%02d-%02dT%02d:%02d:%02dZ",
             gps.date.year(), gps.date.month(), gps.date.day(),
             gps.time.hour(), gps.time.minute(), gps.time.second());
  } else {
    snprintf(timeBuffer, sizeof(timeBuffer), "2026-11-13T%02d:%02d:%02dZ",
             (int)(millis() / 3600000) % 24,
             (int)(millis() / 60000) % 60,
             (int)(millis() / 1000) % 60);
  }

  String jsonBody = "{";
  jsonBody += "\"latitude\":" + String(lat, 8) + ",";
  jsonBody += "\"longitude\":" + String(lon, 8) + ",";
  jsonBody += "\"satellites\":" + String(sats) + ",";
  jsonBody += "\"hdop\":" + String(hdop, 2) + ",";
  jsonBody += "\"distanceM\":" + String(distM, 2) + ",";
  jsonBody += "\"outside\":" + String(outside ? "true" : "false") + ",";
  jsonBody += "\"timestamp\":\"" + String(timeBuffer) + "\"";
  jsonBody += "}";

  // 1. Update /devices/esp32_gps_01/latest.json (PUT)
  String latestUrl = String("/devices/") + DEVICE_ID + "/latest.json?auth=" + FIREBASE_AUTH;
  client.print(String("PUT ") + latestUrl + " HTTP/1.1\r\n" +
               "Host: " + FIREBASE_HOST + "\r\n" +
               "Content-Type: application/json\r\n" +
               "Content-Length: " + jsonBody.length() + "\r\n" +
               "Connection: close\r\n\r\n" +
               jsonBody);
  client.stop();

  // 2. Append to /devices/esp32_gps_01/history.json (POST)
  if (client.connect(FIREBASE_HOST, 443)) {
    String historyUrl = String("/devices/") + DEVICE_ID + "/history.json?auth=" + FIREBASE_AUTH;
    client.print(String("POST ") + historyUrl + " HTTP/1.1\r\n" +
                 "Host: " + FIREBASE_HOST + "\r\n" +
                 "Content-Type: application/json\r\n" +
                 "Content-Length: " + jsonBody.length() + "\r\n" +
                 "Connection: close\r\n\r\n" +
                 jsonBody);
    client.stop();
  }

  // 3. Log alert if outside boundary
  if (outside && client.connect(FIREBASE_HOST, 443)) {
    String alertBody = "{";
    alertBody += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
    alertBody += "\"type\":\"GEOFENCE_BREACH\",";
    alertBody += "\"message\":\"Animal breached geofence boundary!\",";
    alertBody += "\"latitude\":" + String(lat, 8) + ",";
    alertBody += "\"longitude\":" + String(lon, 8) + ",";
    alertBody += "\"distanceM\":" + String(distM, 2) + ",";
    alertBody += "\"outside\":true,";
    alertBody += "\"timestamp\":\"" + String(timeBuffer) + "\"";
    alertBody += "}";

    String alertUrl = String("/alerts/") + DEVICE_ID + ".json?auth=" + FIREBASE_AUTH;
    client.print(String("POST ") + alertUrl + " HTTP/1.1\r\n" +
                 "Host: " + FIREBASE_HOST + "\r\n" +
                 "Content-Type: application/json\r\n" +
                 "Content-Length: " + alertBody.length() + "\r\n" +
                 "Connection: close\r\n\r\n" +
                 alertBody);
    client.stop();
  }

  Serial.println("[Firebase] Telemetry successfully published!");
}

// -----------------------------------------------------------------------------
// Arduino Lifecycle
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==============================================");
  Serial.println("  CattleGuard ESP32 Collar Initializing...   ");
  Serial.println("==============================================");

  // Status LED
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Setup Buzzer PWM channel (ESP32 LEDC peripheral)
  ledcAttach(BUZZER_PIN, BUZZER_FREQ_HZ, PWM_RESOLUTION);
  ledcWrite(PWM_CHANNEL, 0);

  // Initialize NEO-6M GPS on Hardware Serial 2
  gpsSerial.begin(GPS_BAUDRATE, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] Listening on RX=GPIO 16, TX=GPIO 17 @ 9600 baud");

  // Initial Wi-Fi connection
  connectWiFi();

  // Fetch active geofence parameters from cloud
  syncGeofenceFromFirebase();
}

void loop() {
  // Feed GPS serial stream into TinyGPS++
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }

  // Periodic Geofence refresh
  unsigned long currentMs = millis();
  if (currentMs - lastGeofenceFetchMs >= GEOFENCE_FETCH_INTERVAL_MS) {
    lastGeofenceFetchMs = currentMs;
    syncGeofenceFromFirebase();
  }

  // Evaluate location and perimeter containment
  if (gps.location.isValid() && gps.location.isUpdated()) {
    double currentLat = gps.location.lat();
    double currentLon = gps.location.lng();
    int satellites    = gps.satellites.isValid() ? gps.satellites.value() : 0;
    double hdop       = gps.hdop.isValid() ? gps.hdop.hdop() : 99.9;

    // Autonomous Edge Haversine Calculation
    currentDistanceM = computeHaversineDistance(
      geofenceCenterLat, geofenceCenterLon,
      currentLat, currentLon
    );

    isOutsideBoundary = (currentDistanceM > geofenceRadiusM);

    Serial.printf("[Telemetry] Lat: %.8f, Lon: %.8f | Sats: %d, HDOP: %.2f | Dist: %.2fm / Radius: %.1fm | State: %s\n",
                  currentLat, currentLon, satellites, hdop, currentDistanceM, geofenceRadiusM,
                  isOutsideBoundary ? "OUTSIDE (BREACH)" : "SAFE INSIDE");

    // Periodic cloud upload
    if (currentMs - lastTelemetryUploadMs >= TELEMETRY_INTERVAL_MS) {
      lastTelemetryUploadMs = currentMs;
      pushTelemetryToFirebase(currentLat, currentLon, satellites, hdop, currentDistanceM, isOutsideBoundary);
    }
  }

  // Actuate acoustic deterrent if perimeter is breached
  setBuzzerAlert(isOutsideBoundary);

  // Non-blocking loop yield
  yield();
}
