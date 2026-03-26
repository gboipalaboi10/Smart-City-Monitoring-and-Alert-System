# Dasmariñas City DRRM IoT System - Deployment Guide

## 1. Cloud Setup (Firebase)
1. The system uses Firebase Firestore for real-time data.
2. Ensure `firebase-applet-config.json` is correctly populated.
3. Deploy the `firestore.rules` to your Firebase project.

## 2. Gateway Setup (ESP32 LoRa to Internet)
The Gateway node receives LoRa packets and forwards them to the Cloud via WiFi.

### Gateway Logic:
1. Initialize LoRa and WiFi.
2. Listen for LoRa packets.
3. Parse the CSV string: `NodeID,Temp,Hum,AQI,Batt`.
4. Send a POST request to the Firebase REST API or use the Firebase ESP32 library to update the `readings` collection.

## 3. Sensor Node Setup
1. Use the provided `ESP32_LoRa_Node.ino`.
2. Install required libraries in Arduino IDE:
   - `LoRa` by Sandeep Mistry
   - `Adafruit SHT31`
   - `Adafruit SSD1306`
   - `Adafruit GFX`
3. Update `NODE_ID` and `LORA_FREQ` for each deployment.

## 4. Web Dashboard
1. Run `npm install` to install dependencies.
2. Run `npm run dev` to start the local development server.
3. Access the Admin Dashboard at `/dashboard` (Login required).
4. Access the Public Portal at `/`.

## 5. Thresholds & Alerts
Alerts are automatically triggered when:
- Temperature > 40°C
- Humidity < 30%
- AQI > 150

These can be configured in the **Node Management** section of the Admin Dashboard.
