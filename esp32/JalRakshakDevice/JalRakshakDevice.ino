/*
  =====================================================
  JalRakshak AI - ESP32 monitoring device
  =====================================================

  - Reads water sensors (flow, pressure, pH, turbidity, TDS)
  - Shows live readings on a 16x2 I2C LCD (rotating pages)
  - Sends one JSON reading every 5 s over USB (Serial, 115200)
    -> backend/esp32_bridge.py forwards it to the website
  - Optional: also sends over WiFi straight to the backend
  - Shows the website's AI verdict (NORMAL / LEAK / THEFT /
    BAD WATER) on the LCD, sent back by the bridge as
    "STATUS:<overall>:<problem>"

  It NEVER waits forever: no WiFi, no sensor or no laptop
  just means that part is skipped and the LCD keeps working.

  ---- CHANGE THE SETTINGS IN THE "CONFIG" SECTION BELOW ----
*/

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>

// =====================================================
// CONFIG
// =====================================================

// Device identity on the website map (ZONE-01 = Malleshwaram)
const char* DEVICE_ID = "JAL-ESP32-001";
const char* ZONE_ID   = "ZONE-01";

// WiFi (optional). Leave WIFI_SSID empty ("") for USB-only mode.
const char* WIFI_SSID     = "";
const char* WIFI_PASSWORD = "";
// Laptop running the backend (same WiFi network)
const char* SERVER_URL = "http://10.113.207.61:8000/api/sensor-data";

// LCD: I2C pins (ESP32 default SDA 21, SCL 22). The address
// (0x27 or 0x3F) is found automatically.
const int LCD_SDA = 21;
const int LCD_SCL = 22;

// Sensor pins. Set a pin to -1 if that sensor is NOT connected.
// Analog sensors must use ADC1 pins (32-39) so WiFi still works.
const int PIN_FLOW      = 27;  // YF-S201 style pulse flow sensor
const int PIN_PRESSURE  = 34;  // analog pressure transducer
const int PIN_PH        = 35;  // analog pH module
const int PIN_TURBIDITY = 32;  // analog turbidity module
const int PIN_TDS       = 33;  // analog TDS module

// Flow sensor: pulses per second per (L/min). YF-S201 = 7.5
const float FLOW_PULSES_PER_LPM = 7.5;

// pH calibration: pH = 7 + (PH_NEUTRAL_VOLTAGE - volts) * PH_SLOPE
const float PH_NEUTRAL_VOLTAGE = 2.50;
const float PH_SLOPE = 3.5;

// Pressure transducer: voltage at 0 bar and at full scale
// (at the ESP32 pin, i.e. after any voltage divider)
const float PRESSURE_V_MIN = 0.33;
const float PRESSURE_V_MAX = 3.0;
const float PRESSURE_MAX_BAR = 12.0;

// Timing
const unsigned long SEND_INTERVAL_MS = 5000;
const unsigned long PAGE_INTERVAL_MS = 3000;
const unsigned long WIFI_TIMEOUT_MS  = 10000;

// =====================================================
// STATE
// =====================================================

LiquidCrystal_I2C* lcd = nullptr;
bool lcdFound = false;

volatile unsigned long flowPulses = 0;

float flowRate = 0, pressureBar = 0, phValue = 7, turbidityNtu = 0, tdsPpm = 0;
float totalLitres = 0;

String verdict = "WAITING";   // from the website via the bridge
String problem = "";
unsigned long lastVerdictMs = 0;

unsigned long lastSendMs = 0;
unsigned long lastPageMs = 0;
unsigned long lastFlowMs = 0;
unsigned long lastWifiTryMs = 0;
int page = 0;

String serialBuffer = "";

// =====================================================
// HELPERS
// =====================================================

void IRAM_ATTR onFlowPulse() {
  flowPulses++;
}

float readVolts(int pin) {
  if (pin < 0) return 0;
  // Average several samples to reduce noise
  uint32_t total = 0;
  for (int i = 0; i < 16; i++) {
    total += analogReadMilliVolts(pin);
  }
  return (total / 16.0) / 1000.0;
}

// Print exactly 16 characters on one LCD row
void lcdRow(int row, String text) {
  if (!lcdFound) return;
  while (text.length() < 16) text += " ";
  lcd->setCursor(0, row);
  lcd->print(text.substring(0, 16));
}

bool i2cDevicePresent(uint8_t address) {
  Wire.beginTransmission(address);
  return Wire.endTransmission() == 0;
}

void setupLcd() {
  Wire.begin(LCD_SDA, LCD_SCL);

  const uint8_t candidates[] = {0x27, 0x3F, 0x20, 0x38};
  for (uint8_t address : candidates) {
    if (i2cDevicePresent(address)) {
      lcd = new LiquidCrystal_I2C(address, 16, 2);
      lcd->init();
      lcd->backlight();
      lcdFound = true;
      Serial.printf("LCD found at 0x%02X\n", address);
      return;
    }
  }
  Serial.println("LCD not found on I2C (check SDA/SCL wiring)");
}

void connectWifi(bool waitForIt) {
  if (strlen(WIFI_SSID) == 0) return;

  lastWifiTryMs = millis();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  if (!waitForIt) return;

  lcdRow(1, "WiFi connecting");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected, IP ");
    Serial.println(WiFi.localIP());
    lcdRow(1, "WiFi OK");
  } else {
    Serial.println("WiFi not connected - continuing in USB mode");
    lcdRow(1, "WiFi failed:USB");
  }
  delay(800);
}

// =====================================================
// SENSORS
// =====================================================

void readSensors() {
  unsigned long now = millis();

  if (PIN_FLOW >= 0) {
    noInterrupts();
    unsigned long pulses = flowPulses;
    flowPulses = 0;
    interrupts();

    float seconds = (now - lastFlowMs) / 1000.0;
    if (seconds > 0) {
      flowRate = (pulses / seconds) / FLOW_PULSES_PER_LPM;
      totalLitres += flowRate * seconds / 60.0;
    }
  }
  lastFlowMs = now;

  if (PIN_PRESSURE >= 0) {
    float v = readVolts(PIN_PRESSURE);
    pressureBar = (v - PRESSURE_V_MIN) / (PRESSURE_V_MAX - PRESSURE_V_MIN) * PRESSURE_MAX_BAR;
    if (pressureBar < 0) pressureBar = 0;
  }

  if (PIN_PH >= 0) {
    float v = readVolts(PIN_PH);
    phValue = 7.0 + (PH_NEUTRAL_VOLTAGE - v) * PH_SLOPE;
    phValue = constrain(phValue, 0.0, 14.0);
  }

  if (PIN_TURBIDITY >= 0) {
    // Typical module: ~3.0 V clear water, lower = cloudier
    float v = readVolts(PIN_TURBIDITY);
    turbidityNtu = (3.0 - v) * 1000.0 / 3.0;
    if (turbidityNtu < 0) turbidityNtu = 0;
  }

  if (PIN_TDS >= 0) {
    // Gravity TDS formula at 25 C
    float v = readVolts(PIN_TDS);
    tdsPpm = (133.42 * v * v * v - 255.86 * v * v + 857.39 * v) * 0.5;
    if (tdsPpm < 0) tdsPpm = 0;
  }
}

// One JSON line; only connected sensors are included
String readingJson() {
  String json = "{";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\"";
  json += ",\"source\":\"ESP32\"";
  json += ",\"zone_id\":\"" + String(ZONE_ID) + "\"";
  if (PIN_FLOW >= 0)      json += ",\"flow_rate\":" + String(flowRate, 2);
  if (PIN_PRESSURE >= 0)  json += ",\"pressure_bar\":" + String(pressureBar, 2);
  if (PIN_PH >= 0)        json += ",\"ph\":" + String(phValue, 2);
  if (PIN_TURBIDITY >= 0) json += ",\"turbidity\":" + String(turbidityNtu, 1);
  if (PIN_TDS >= 0)       json += ",\"tds\":" + String(tdsPpm, 0);
  json += ",\"total_litres\":" + String(totalLitres, 2);
  json += "}";
  return json;
}

// =====================================================
// WEBSITE VERDICT
// =====================================================

void setVerdict(String overall, String what) {
  verdict = overall;
  problem = what;
  lastVerdictMs = millis();
}

// Bridge sends: STATUS:<NORMAL|WARNING|CRITICAL>:<LEAKAGE|THEFT|QUALITY|...>
void readSerialCommands() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      serialBuffer.trim();
      if (serialBuffer.startsWith("STATUS:")) {
        String rest = serialBuffer.substring(7);
        int sep = rest.indexOf(':');
        if (sep >= 0) setVerdict(rest.substring(0, sep), rest.substring(sep + 1));
        else setVerdict(rest, "");
      }
      serialBuffer = "";
    } else if (serialBuffer.length() < 80) {
      serialBuffer += c;
    }
  }
}

void sendOverWifi(const String& json) {
  if (strlen(WIFI_SSID) == 0) return;

  if (WiFi.status() != WL_CONNECTED) {
    // Retry quietly every 30 s; never block the LCD
    if (millis() - lastWifiTryMs > 30000) connectWifi(false);
    return;
  }

  // Backend also needs these two fields
  String body = json.substring(0, json.length() - 1) +
                ",\"status\":\"NORMAL\",\"alert\":\"ESP32 WiFi reading\"}";

  HTTPClient http;
  http.setTimeout(3000);
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);

  if (code == 200) {
    String response = http.getString();
    String overall = response.indexOf("\"overall_status\":\"CRITICAL\"") >= 0 ? "CRITICAL"
                   : response.indexOf("\"overall_status\":\"WARNING\"") >= 0 ? "WARNING"
                   : "NORMAL";
    String what = response.indexOf("\"detected\":true") >= 0 ? "LEAKAGE"
                : response.indexOf("\"suspicious\":true") >= 0 ? "THEFT"
                : response.indexOf("\"problem\":true") >= 0 ? "QUALITY"
                : "";
    setVerdict(overall, what);
  }
  http.end();
}

// =====================================================
// LCD PAGES
// =====================================================

String verdictText() {
  if (millis() - lastVerdictMs > 20000) return "Website: offline";
  if (verdict == "NORMAL") return "Status: NORMAL";
  if (problem == "LEAKAGE") return "!! LEAK ALERT !!";
  if (problem == "THEFT")   return "!! THEFT ALERT !";
  if (problem == "QUALITY") return "!! BAD WATER !!";
  return "Status: " + verdict;
}

void showPage() {
  if (!lcdFound) return;

  bool alarm = millis() - lastVerdictMs <= 20000 && verdict != "NORMAL";

  switch (page) {
    case 0:
      lcdRow(0, "Flow " + String(flowRate, 1) + " L/min");
      lcdRow(1, "Pres " + String(pressureBar, 2) + " bar");
      break;
    case 1:
      lcdRow(0, "pH   " + String(phValue, 2));
      lcdRow(1, "Turb " + String(turbidityNtu, 1) + " NTU");
      break;
    case 2:
      lcdRow(0, "TDS  " + String(tdsPpm, 0) + " ppm");
      lcdRow(1, "Used " + String(totalLitres, 1) + " L");
      break;
    case 3:
      lcdRow(0, "JalRakshak " + String(ZONE_ID).substring(5));
      lcdRow(1, verdictText());
      break;
  }

  // Blink the backlight while the website reports a problem
  if (alarm && page == 3) {
    for (int i = 0; i < 3; i++) {
      lcd->noBacklight(); delay(150);
      lcd->backlight();   delay(150);
    }
  }

  page = (page + 1) % 4;
}

// =====================================================
// SETUP / LOOP
// =====================================================

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("JalRakshak AI device starting");

  setupLcd();
  lcdRow(0, "Jal Rakshak AI");
  lcdRow(1, "Starting...");

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);   // 0 - 3.3 V range

  if (PIN_FLOW >= 0) {
    pinMode(PIN_FLOW, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_FLOW), onFlowPulse, FALLING);
  }
  lastFlowMs = millis();

  connectWifi(true);   // waits at most WIFI_TIMEOUT_MS

  lcdRow(1, strlen(WIFI_SSID) && WiFi.status() == WL_CONNECTED ? "Ready (WiFi)" : "Ready (USB)");
  Serial.println("JalRakshak AI device ready");
  delay(1000);
}

void loop() {
  unsigned long now = millis();

  readSerialCommands();

  if (now - lastSendMs >= SEND_INTERVAL_MS) {
    lastSendMs = now;
    readSensors();

    String json = readingJson();
    Serial.println(json);     // picked up by esp32_bridge.py
    sendOverWifi(json);
  }

  if (now - lastPageMs >= PAGE_INTERVAL_MS) {
    lastPageMs = now;
    showPage();
  }
}
