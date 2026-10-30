
// ──────────────────────────────────────────────────────────────
//  LIBRARIES
// ──────────────────────────────────────────────────────────────
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>



const bool MOISTURE_SENSOR_ENABLED = true;   
const bool PH_SENSOR_ENABLED       = true; 
const bool TEMP_SENSOR_ENABLED     = true; 


// ──────────────────────────────────────────────────────────────
//  WI-FI CONFIGURATION  ← UPDATE THESE
// ──────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "B315_20312";
const char* WIFI_PASSWORD = "DEEABE7H406";

// ──────────────────────────────────────────────────────────────
//  SERVER CONFIGURATION  ← UPDATE THE IP ADDRESS
//  Find your PC's local IP: open Command Prompt → type "ipconfig"
//  Look for "IPv4 Address" e.g. 192.168.1.5
// ──────────────────────────────────────────────────────────────
const char* API_URL        = "https://soilsense-api-xfc4.onrender.com/api/sensors/reading";
const char* DEVICE_API_KEY = "soilsense-dev-key";   // Must match ESP32_DEVICE_API_KEY in backend/.env
const char* DEVICE_ID      = "SS-ESP32-001";        // Unique name for this device


// ──────────────────────────────────────────────────────────────
//  TIMING
// ──────────────────────────────────────────────────────────────
const unsigned long READING_INTERVAL_MS = 30000;  // Send readings every 30 seconds


// ──────────────────────────────────────────────────────────────
//  PIN ASSIGNMENTS
// ──────────────────────────────────────────────────────────────
const int PIN_MOISTURE = 35;   // YL-69 AO → GPIO 35 (ADC1 channel 7)
const int PIN_PH       = 34;   // pH module AO → GPIO 34 (ADC1 channel 6)
const int PIN_TEMP     = 4;    // DS18B20 data → GPIO 4
const int PIN_LED      = 2;    // Built-in LED (most ESP32 boards)


// ──────────────────────────────────────────────────────────────
//  YL-69 MOISTURE CALIBRATION
//  ─────────────────────────
//  Dry air reading  (probe in air, no soil contact) → high ADC value
//  Wet reading      (probe fully in water)          → low ADC value
//  Adjust these after running the calibration procedure above.
// ──────────────────────────────────────────────────────────────
const int MOISTURE_ADC_DRY = 3500;   // ADC when completely dry  → 0%
const int MOISTURE_ADC_WET = 1200;   // ADC when in water        → 100%

const float PH_VOLTAGE_AT_7 = 2.50;   // Volts at pH 7.0 (typical value)
const float PH_SLOPE        = -0.18;  // Volts per pH unit


// ──────────────────────────────────────────────────────────────
//  ADC REFERENCE
// ──────────────────────────────────────────────────────────────
const float ADC_REF_VOLTAGE = 3.3;
const int   ADC_MAX         = 4095;   // 12-bit ADC


 OneWire           oneWireBus(PIN_TEMP);
 DallasTemperature tempSensor(&oneWireBus);


// ──────────────────────────────────────────────────────────────
//  GLOBAL STATE
// ──────────────────────────────────────────────────────────────
unsigned long lastSendTime = 0;
bool          wifiOK       = false;


// ══════════════════════════════════════════════════════════════
//  SETUP
// ══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(600);

  // ── Print startup banner ──────────────────────────────────
  Serial.println();
  Serial.println("╔═══════════════════════════════════╗");
  Serial.println("║   SoilSense ESP32 Sensor v2.0     ║");
  Serial.println("╚═══════════════════════════════════╝");
  Serial.println("Device ID : " + String(DEVICE_ID));
  Serial.println("Server    : " + String(API_URL));
  Serial.println();
  Serial.println("Sensors enabled:");
  Serial.println("  Moisture    : " + String(MOISTURE_SENSOR_ENABLED ? "YES ✓" : "NO"));
  Serial.println("  pH          : " + String(PH_SENSOR_ENABLED       ? "YES ✓" : "NO (add pH module)"));
  Serial.println("  Temperature : " + String(TEMP_SENSOR_ENABLED     ? "YES ✓" : "NO (add DS18B20 probe)"));
  Serial.println();

  // ── Configure pins ────────────────────────────────────────
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  if (MOISTURE_SENSOR_ENABLED) {
    pinMode(PIN_MOISTURE, INPUT);
    Serial.println("[PIN] GPIO " + String(PIN_MOISTURE) + " = Moisture sensor AO");
  }
  if (PH_SENSOR_ENABLED) {
    pinMode(PIN_PH, INPUT);
    Serial.println("[PIN] GPIO " + String(PIN_PH) + " = pH sensor AO");
  }

  // ── Configure ADC ────────────────────────────────────────
  analogReadResolution(12);          // 12-bit → 0–4095
  analogSetAttenuation(ADC_11db);    // Full 3.3V range


   if (TEMP_SENSOR_ENABLED) {
     tempSensor.begin();
   int count = tempSensor.getDeviceCount();
   Serial.println("[TEMP] DS18B20 sensors found: " + String(count));
  }

  // ── Connect to Wi-Fi ─────────────────────────────────────
  connectWiFi();
}


// ══════════════════════════════════════════════════════════════
//  MAIN LOOP
// ══════════════════════════════════════════════════════════════
void loop() {

  // ── Reconnect Wi-Fi if dropped ───────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    wifiOK = false;
    Serial.println("[WARN] Wi-Fi disconnected — reconnecting...");
    connectWiFi();
    return;
  }

  // ── Take and send a reading every READING_INTERVAL_MS ────
  unsigned long now = millis();
  if (now - lastSendTime >= READING_INTERVAL_MS) {
    lastSendTime = now;
    takeMeasurementAndSend();
  }

  delay(100);
}


// ══════════════════════════════════════════════════════════════
//  TAKE MEASUREMENT AND SEND
// ══════════════════════════════════════════════════════════════
void takeMeasurementAndSend() {
  Serial.println();
  Serial.println("──────── Reading Sensors ────────");

  // ── Variables (NaN = not available) ──────────────────────
  float moisture    = NAN;
  float ph          = NAN;
  float temperature = NAN;

  // ── Read Moisture ─────────────────────────────────────────
  if (MOISTURE_SENSOR_ENABLED) {
    moisture = readMoisture();
    Serial.print("  Soil Moisture : ");
    Serial.print(moisture, 1);
    Serial.println(" %");
  }

  // ── Read pH ───────────────────────────────────────────────
  if (PH_SENSOR_ENABLED) {
    ph = readPH();
    if (!isnan(ph) && ph >= 0.0 && ph <= 14.0) {
      Serial.print("  Soil pH       : ");
      Serial.println(ph, 2);
    } else {
      Serial.println("  Soil pH       : INVALID — check wiring/calibration");
      ph = NAN;
    }
  }

  // ── Read Temperature ──────────────────────────────────────
  if (TEMP_SENSOR_ENABLED) {
    temperature = readTemperature();
    if (!isnan(temperature) && temperature > -100.0) {
      Serial.print("  Soil Temp     : ");
      Serial.print(temperature, 1);
      Serial.println(" °C");
    } else {
      Serial.println("  Soil Temp     : INVALID — check DS18B20 wiring");
      temperature = NAN;
    }
  }

  // ── Send to SoilSense backend ─────────────────────────────
  bool sent = sendToServer(moisture, ph, temperature);
  if (sent) {
    Serial.println("[OK]  Data sent successfully ✓");
    blinkLED(1, 500);
  } else {
    Serial.println("[ERR] Send failed — will retry next cycle");
    blinkLED(5, 100);
  }
}



float readMoisture() {
  const int SAMPLES = 10;
  long adcSum = 0;

  for (int i = 0; i < SAMPLES; i++) {
    adcSum += analogRead(PIN_MOISTURE);
    delay(15);
  }
  float adcAvg = (float)adcSum / SAMPLES;

  // Print raw ADC value for calibration purposes
  Serial.print("  [DEBUG] Moisture ADC raw: ");
  Serial.println((int)adcAvg);

  // Map ADC range to 0–100%
  // DRY → high ADC → 0%
  // WET → low ADC  → 100%
  float moisture = (float)(MOISTURE_ADC_DRY - adcAvg)
                 / (float)(MOISTURE_ADC_DRY - MOISTURE_ADC_WET)
                 * 100.0;

  // Clamp to 0–100
  return constrain(moisture, 0.0, 100.0);
}


float readPH() {
  const int SAMPLES = 10;
  long adcSum = 0;

  for (int i = 0; i < SAMPLES; i++) {
    adcSum += analogRead(PIN_PH);
    delay(15);
  }
  float adcAvg  = (float)adcSum / SAMPLES;
  float voltage = (adcAvg / ADC_MAX) * ADC_REF_VOLTAGE;

  Serial.print("  [DEBUG] pH ADC raw: ");
  Serial.print((int)adcAvg);
  Serial.print("  Voltage: ");
  Serial.print(voltage, 3);
  Serial.println("V");

  // Convert voltage to pH
  float ph = 7.0 + ((voltage - PH_VOLTAGE_AT_7) / PH_SLOPE);
  return constrain(ph, 0.0, 14.0);
}


// ══════════════════════════════════════════════════════════════
//  SENSOR: DS18B20 SOIL TEMPERATURE  (enable when you add it)
// ══════════════════════════════════════════════════════════════
/**
 * Reads soil temperature from DS18B20 via OneWire protocol.
 *
 * WIRING:
 *   DS18B20 Pin 1 (GND)  → ESP32 GND
 *   DS18B20 Pin 2 (DATA) → ESP32 GPIO 4  +  4.7kΩ resistor to 3.3V
 *   DS18B20 Pin 3 (VCC)  → ESP32 3.3V
 *
 * LIBRARIES (install via Arduino Library Manager):
 *   - "OneWire" by Paul Stoffregen
 *   - "DallasTemperature" by Miles Burton
 *
 * Returns temperature in °C, or -999 if sensor not found.
 */
float readTemperature() {

   tempSensor.requestTemperatures();
   delay(750);  // Wait for conversion (12-bit mode needs ~750ms)
  float tempC = tempSensor.getTempCByIndex(0);
  
   if (tempC == DEVICE_DISCONNECTED_C) {
   Serial.println("  [DEBUG] DS18B20 not found on bus");
    return -999.0;
  }
   return tempC;
  return -999.0;
}


bool sendToServer(float moisture, float ph, float temperature) {
  if (WiFi.status() != WL_CONNECTED) return false;

  // Determine what we actually have
  bool hasMoisture    = MOISTURE_SENSOR_ENABLED && !isnan(moisture);
  bool hasPH          = PH_SENSOR_ENABLED       && !isnan(ph) && ph >= 0 && ph <= 14;
  bool hasTemperature = TEMP_SENSOR_ENABLED      && !isnan(temperature) && temperature > -100;

  // Need at least moisture to send a useful reading
  if (!hasMoisture && !hasPH && !hasTemperature) {
    Serial.println("[SKIP] No valid sensor data — nothing to send");
    return false;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  http.setTimeout(10000);

  // ── Build JSON payload ────────────────────────────────────
  StaticJsonDocument<256> doc;

  doc["deviceId"] = DEVICE_ID;

  // soilPH — send actual value if available, else neutral placeholder
  if (hasPH) {
    doc["soilPH"]        = round(ph * 100.0) / 100.0;
  } else {
    doc["soilPH"]        = 7.0;       // neutral placeholder
    doc["phAvailable"]   = false;     // tells backend pH was not measured
  }

  // soilMoisture
  if (hasMoisture) {
    doc["soilMoisture"]  = round(moisture * 10.0) / 10.0;
  }

  // soilTemperature — only included if sensor is present
  if (hasTemperature) {
    doc["soilTemperature"] = round(temperature * 10.0) / 10.0;
  }

  String jsonBody;
  serializeJson(doc, jsonBody);

  Serial.println("[HTTP] POST → " + String(API_URL));
  Serial.println("[HTTP] Body → " + jsonBody);

  int httpCode = http.POST(jsonBody);

  Serial.print("[HTTP] Response code: ");
  Serial.println(httpCode);

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.println("[HTTP] Server reply: " + response);
    http.end();
    return true;
  } else {
    Serial.println("[HTTP] Request failed. Check IP, port, and API key.");
    http.end();
    return false;
  }
}


// ══════════════════════════════════════════════════════════════
//  WI-FI CONNECTION
// ══════════════════════════════════════════════════════════════
void connectWiFi() {
  Serial.println("[WiFi] Connecting to: " + String(WIFI_SSID));

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));  // Blink while connecting
    tries++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiOK = true;
    Serial.println("[WiFi] Connected! ✓");
    Serial.println("[WiFi] IP Address : " + WiFi.localIP().toString());
    Serial.println("[WiFi] Signal     : " + String(WiFi.RSSI()) + " dBm");
    digitalWrite(PIN_LED, HIGH);  // Solid ON = connected
  } else {
    wifiOK = false;
    Serial.println("[WiFi] FAILED — retrying in next loop");
    Serial.println("[WiFi] Check: SSID, password, and that 2.4GHz is used");
    Serial.println("[WiFi]        (ESP32 does NOT support 5GHz networks)");
    digitalWrite(PIN_LED, LOW);
  }
}


// ══════════════════════════════════════════════════════════════
//  UTILITY: STATUS LED BLINK
// ══════════════════════════════════════════════════════════════
void blinkLED(int times, int msEach) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_LED, HIGH); delay(msEach);
    digitalWrite(PIN_LED, LOW);  delay(msEach);
  }
  // Restore solid ON if Wi-Fi is connected
  if (wifiOK) digitalWrite(PIN_LED, HIGH);
}
