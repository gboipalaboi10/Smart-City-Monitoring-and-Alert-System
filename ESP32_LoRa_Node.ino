/*
  Dasmariñas City DRRM IoT Monitoring System
  ESP32 LoRa Sensor Node (Client)
  
  Hardware:
  - ESP32 Development Board
  - LoRa Module (SX1276/SX1278)
  - SHT31 Temperature & Humidity Sensor (I2C)
  - MQ-135 Gas Sensor (Analog)
  - SSD1306 OLED Display (I2C)
*/

#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// --- CONFIGURATION ---
#define NODE_ID "DASMA-01"
#define LORA_FREQ 433E6 // Change to your local frequency (e.g., 915E6)
#define SEND_INTERVAL 30000 // 30 seconds

// Pins for LoRa
#define SCK 5
#define MISO 19
#define MOSI 27
#define SS 18
#define RST 14
#define DIO0 26

// OLED Config
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// SHT31 Config
Adafruit_SHT31 sht31 = Adafruit_SHT31();

// MQ-135 Pin
#define MQ135_PIN 34

void setup() {
  Serial.begin(115200);
  
  // Initialize OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
  }
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(0,0);
  display.println("DASMA DRRM IoT");
  display.println("Initializing...");
  display.display();

  // Initialize SHT31
  if (!sht31.begin(0x44)) {
    Serial.println("Couldn't find SHT31");
  }

  // Initialize LoRa
  LoRa.setPins(SS, RST, DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("Starting LoRa failed!");
    display.println("LoRa Error!");
    display.display();
    while (1);
  }
  
  display.println("System Ready");
  display.display();
  delay(2000);
}

void loop() {
  // 1. Read Sensors
  float t = sht31.readTemperature();
  float h = sht31.readHumidity();
  int aqiRaw = analogRead(MQ135_PIN);
  float aqi = map(aqiRaw, 0, 4095, 0, 500); // Simple mapping for demo
  float battery = (analogRead(35) * 2.0 * 3.3 / 4096.0); // Assuming voltage divider on GPIO35

  // 2. Update Local Display
  display.clearDisplay();
  display.setCursor(0,0);
  display.printf("ID: %s\n", NODE_ID);
  display.printf("Temp: %.1f C\n", t);
  display.printf("Hum: %.1f %%\n", h);
  display.printf("AQI: %.0f\n", aqi);
  display.printf("Batt: %.2f V\n", battery);
  display.display();

  // 3. Transmit via LoRa
  // Format: NodeID,Temp,Hum,AQI,Batt
  String packet = String(NODE_ID) + "," + 
                  String(t) + "," + 
                  String(h) + "," + 
                  String(aqi) + "," + 
                  String(battery);
                  
  Serial.print("Sending packet: ");
  Serial.println(packet);

  LoRa.beginPacket();
  LoRa.print(packet);
  LoRa.endPacket();

  delay(SEND_INTERVAL);
}
