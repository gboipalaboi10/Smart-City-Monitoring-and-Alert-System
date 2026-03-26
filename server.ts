import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
  });
}

const db = admin.firestore();
if (firebaseConfig.firestoreDatabaseId) {
  // If a specific database ID is provided, we use it
  // Note: Standard firebase-admin doesn't easily support named databases in the same way as client SDK
  // but for most apps, the default database is used.
  // If it's a named database, we might need to use the full path or a different initialization.
  // For now, we'll assume the default database is sufficient or the projectId handles it.
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", city: "Dasmariñas", system: "DRRM IoT" });
  });

  // Sensor Data Ingestion Endpoint
  app.post("/api/sensor-data", async (req, res) => {
    try {
      const { nodeId, temp, humidity, pressure, aqi, battery } = req.body;

      if (!nodeId) {
        return res.status(400).json({ error: "nodeId is required" });
      }

      // 1. Log the reading
      const readingData = {
        nodeId,
        temp: Number(temp),
        humidity: Number(humidity),
        pressure: Number(pressure),
        aqi: Number(aqi),
        battery: Number(battery || 0),
        timestamp: new Date().toISOString()
      };

      await db.collection("readings").add(readingData);

      // 2. Update Node status
      const nodeRef = db.collection("nodes").doc(nodeId);
      const nodeSnap = await nodeRef.get();

      if (nodeSnap.exists) {
        await nodeRef.update({
          status: "online",
          lastUpdate: new Date().toISOString(),
          battery: Number(battery || 0)
        });

        // 3. Check for Alerts
        const node = nodeSnap.data();
        if (node) {
          const thresholds = node.thresholds || { tempMax: 40, aqiMax: 100 };

          if (temp > thresholds.tempMax) {
            await db.collection("alerts").add({
              nodeId,
              barangay: node.barangay,
              type: "heat",
              severity: temp > thresholds.tempMax + 5 ? "critical" : "warning",
              message: `High temperature detected: ${temp}°C`,
              timestamp: new Date().toISOString(),
              resolved: false
            });
          }

          if (aqi > thresholds.aqiMax) {
            await db.collection("alerts").add({
              nodeId,
              barangay: node.barangay,
              type: "air_quality",
              severity: aqi > thresholds.aqiMax * 1.5 ? "critical" : "warning",
              message: `Poor air quality detected: AQI ${aqi}`,
              timestamp: new Date().toISOString(),
              resolved: false
            });
          }
        }
      }

      res.json({ success: true, message: "Data received and processed" });
    } catch (error) {
      console.error("Sensor Data Error:", error);
      res.status(500).json({ error: "Failed to process sensor data" });
    }
  });

  app.get("/api/weather", async (req, res) => {
    try {
      // Dasmariñas City coordinates
      const lat = 14.32;
      const lon = 120.93;
      
      // Fetch from Open-Meteo (Free, No API Key required)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,surface_pressure,visibility,wind_speed_10m&hourly=precipitation_probability&timezone=Asia%2FSingapore&forecast_days=1`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        return res.status(500).json({ error: "Weather service error" });
      }

      const current = data.current;
      const hourly = data.hourly;

      // WMO Weather codes for Thunderstorm: 95, 96, 99
      const isThunderstorm = [95, 96, 99].includes(current.weather_code);
      
      // Max rain probability in the next 24h
      const maxRainProb = Math.max(...hourly.precipitation_probability);

      // Map WMO code to simple description
      const getCondition = (code: number) => {
        if (code === 0) return "Clear Sky";
        if (code <= 3) return "Partly Cloudy";
        if (code <= 48) return "Foggy";
        if (code <= 57) return "Drizzle";
        if (code <= 67) return "Rainy";
        if (code <= 77) return "Snowy";
        if (code <= 82) return "Rain Showers";
        if (code <= 99) return "Thunderstorm";
        return "Overcast";
      };

      // Map WMO code to OpenWeatherMap-like icons for compatibility
      const getIcon = (code: number) => {
        if (code === 0) return "01d";
        if (code <= 3) return "02d";
        if (code <= 48) return "50d";
        if (code <= 57) return "09d";
        if (code <= 67) return "10d";
        if (code <= 82) return "09d";
        if (code <= 99) return "11d";
        return "03d";
      };

      res.json({
        current: {
          temp: current.temperature_2m,
          feels_like: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          pressure: current.pressure_msl,
          visibility: current.visibility || 10000,
          wind_speed: current.wind_speed_10m,
          description: getCondition(current.weather_code),
          main: getCondition(current.weather_code).split(' ')[0],
          icon: getIcon(current.weather_code)
        },
        alerts: {
          thunderstorm: isThunderstorm,
          rainProbability: maxRainProb, // already in percentage
          summary: isThunderstorm ? "Thunderstorm detected in the area!" : 
                   maxRainProb > 50 ? "High probability of rain in the next 24h." : "No immediate weather threats."
        }
      });
    } catch (error) {
      console.error("Weather API Error:", error);
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
