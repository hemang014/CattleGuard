# CattleGuard Collar: ESP32 Hardware Wiring, Pinout & Schematics
> **Author:** Member 1 — IoT & Hardware Lead  
> **Target Device:** `esp32_gps_01`  
> **Firmware:** `esp32_cattleguard.ino`

---

## 📋 Bill of Materials (BOM)

| Component | Specification / Model | Qty | Purpose |
| :--- | :--- | :---: | :--- |
| **Microcontroller** | ESP32 DevKit V1 (30-pin, dual-core Tensilica Xtensa 32-bit LX6) | 1 | Telemetry processing, Haversine calculation, Wi-Fi uplink |
| **GPS Module** | u-blox NEO-6M with ceramic patch antenna & battery backup | 1 | High-precision satellite coordinate acquisition (NMEA) |
| **Buzzer** | 5V Active / Passive Piezo Electric Buzzer (2.4 kHz) | 1 | Acoustic auditory warning deterrent for cattle herd |
| **MOSFET** | IRLZ44N (Logic-Level N-Channel Power MOSFET, TO-220) | 1 | Drives buzzer safely from ESP32 3.3V GPIO without overloading pins |
| **Resistor R1** | 100 Ω (1/4 W) | 1 | Gate protection resistor (limits transient switching current) |
| **Resistor R2** | 10 kΩ (1/4 W) | 1 | Gate pull-down resistor (prevents false buzzer floating triggers) |
| **Diode D1** | 1N4007 or 1N4148 | 1 | Flyback protection diode across buzzer terminals |
| **Battery** | 18650 Li-Ion 3.7V 2600mAh – 3400mAh cell | 1 | Long-lasting mobile collar power source |
| **Charger** | TP4056 Micro-USB / Type-C with integrated BMS protection | 1 | Constant-current/constant-voltage battery charging |
| **Boost Converter**| MT3608 DC-DC Step-Up Boost Module (set to 5.0V output) | 1 | Steps up 3.7V Li-Ion to clean 5V for ESP32 VIN & Buzzer |
| **Solar Panel** | 5V / 6V 1W monocrystalline solar cell (waterproof) | 1 | Trickle charges 18650 cell via TP4056 during daytime grazing |

---

## 📌 Microcontroller Pin Assignment

| ESP32 DevKit Pin | Peripheral Connected | Direction | Signal / Function |
| :--- | :--- | :---: | :--- |
| **GPIO 16 (RX2)** | NEO-6M GPS `TX` pin | **INPUT** | Receives NMEA coordinate strings at 9600 baud |
| **GPIO 17 (TX2)** | NEO-6M GPS `RX` pin | **OUTPUT** | Sends configuration commands to GPS module |
| **GPIO 18 (PWM)** | MOSFET Gate (via 100Ω) | **OUTPUT** | Triggers 2.4 kHz buzzer modulation upon geofence breach |
| **GPIO 2** | Built-in Blue LED | **OUTPUT** | Hardware heartbeat & breach alert indicator |
| **VIN (5V)** | MT3608 5V Output | **POWER** | Primary regulated 5V power input |
| **GND** | Common System Ground | **GROUND** | Unified ground rail across ESP32, GPS, MOSFET, & Battery |
| **3.3V** | NEO-6M `VCC` | **POWER** | Clean 3.3V supply to GPS logic module |

---

## 🔌 Circuit Schematic & Wiring Diagram

```
                              +5V (from MT3608 Boost / Battery)
                                    |
                                    +-----------------------+
                                    |                       |
                                   [+]                     [+]
                             +---------------+        +------------+
                             | 5V Piezo      |        | Diode      |
                             | Buzzer        |        | 1N4007     |
                             | (2.4 kHz)     |        | (Cathode)  |
                             +---------------+        +------------+
                                   [-]                     [-]
                                    |                       |
                                    +-----------+-----------+
                                                |
                                             Drain (D)
                                            +---------+
   ESP32 DevKit                            | IRLZ44N |
+------------------+     100 Ohm           | N-MOS   |
|                  |     Resistor          |         |
|   GPIO 18 (PWM)  |-----[ R1 ]-----+----->| Gate(G) |
|                  |                |      |         |
|                  |             [ R2 ]    |         |
|                  |             10k Ohm   | Source(S)
|                  |            Pull-down  +---------+
|                  |                |           |
|      GND         |----------------+-----------+--- Common System Ground
|                  |                                 |
|   GPIO 16 (RX2)  |<====== TX  (NEO-6M GPS)        |
|   GPIO 17 (TX2)  |======> RX  (NEO-6M GPS)        |
|      3.3V        |------> VCC (NEO-6M GPS)        |
|      GND         |------> GND (NEO-6M GPS)--------+
+------------------+
```

---

## ☀️ Solar Power & Battery Management Circuit

```
  [ Solar Panel ] (5V-6V)
         |
         v
    +---------+       +---------------+       +---------+
    | TP4056  |====>  | 18650 Li-Ion  |====>  | MT3608  |====> 5.0V Regulated
    | Charger |       | Battery 3.7V  |       | Boost   |      (To ESP32 VIN)
    +---------+       +---------------+       +---------+
```

---

## 🚀 Flashing & Setup Instructions

1. **Arduino IDE Setup:**
   - Install **ESP32 Board Package by Espressif** (`v2.0.14` or `v3.0.x`).
   - Select Board: `ESP32 Dev Module`.
   - Install required libraries via Library Manager:
     - `TinyGPSPlus` by Mikal Hart.
2. **Configuration:**
   - Open `esp32_cattleguard.ino`.
   - Update `WIFI_SSID` and `WIFI_PASSWORD` with your field router or mobile hotspot credentials.
   - Insert your Firebase Auth token in `FIREBASE_AUTH`.
3. **Upload:**
   - Connect ESP32 via Micro-USB, select COM Port, and click **Upload**.
