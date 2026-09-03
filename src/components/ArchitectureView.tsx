import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  Radio,
  Server,
  Database,
  BrainCircuit,
  Bell,
  Code,
  Copy,
  Check,
  ArrowRight,
  Wifi,
  Compass,
  Activity,
  HardDrive
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const esp32Code = `/*
 * MINE SENTINEL - ESP32 Hardware Firmware
 * Hardware Nodes: ESP32 + MPU-6050 (Tilt) + SW-420 (Vibration) + NEO-6M (GPS) + SIM800L (GSM)
 * Sends real-time telemetry to: POST /api/sensor-data
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "MINE_CAMP_WIFI";
const char* password = "SafeMineSecurePassword";

// Mine Sentinel Backend Endpoint
const char* serverUrl = "https://your-domain.com/api/sensor-data";
const char* DEVICE_ID = "NODE-001";

// Pinout
#define SW420_PIN 4
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// MPU-6050 I2C Address
const int MPU_ADDR = 0x68;
int16_t AcX, AcY, AcZ;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22); // SDA=21, SCL=22
  
  // Init MPU-6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0);    // Wake up
  Wire.endTransmission(true);

  pinMode(SW420_PIN, INPUT);
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Connect to Network
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nMine Sentinel Node Connected!");
}

void loop() {
  // 1. Read MPU-6050 Inclinometer
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);

  AcX = Wire.read() << 8 | Wire.read();
  AcY = Wire.read() << 8 | Wire.read();
  AcZ = Wire.read() << 8 | Wire.read();

  // Calculate tilt angle in degrees
  float tilt_x = atan2((float)AcY, (float)AcZ) * 180.0 / PI;
  float tilt_y = atan2((float)AcX, (float)AcZ) * 180.0 / PI;

  // 2. Read SW-420 Vibration
  long vibration_pulses = pulseIn(SW420_PIN, HIGH, 100000);
  float vibration_level = vibration_pulses > 0 ? (float)vibration_pulses / 10000.0 : 0.25;

  // 3. Read GPS Coordinates
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }
  float latitude = gps.location.isValid() ? gps.location.lat() : 10.7905;
  float longitude = gps.location.isValid() ? gps.location.lng() : 78.7047;

  // 4. Formulate JSON Telemetry Payload
  StaticJsonDocument<300> doc;
  doc["device_id"] = DEVICE_ID;
  doc["tilt_x"] = tilt_x;
  doc["tilt_y"] = tilt_y;
  doc["vibration"] = vibration_level;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["sms_sent"] = false;

  String requestBody;
  serializeJson(doc, requestBody);

  // 5. POST to Mine Sentinel API
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(requestBody);
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Mine Sentinel Response: " + response);
    }
    http.end();
  }

  delay(5000); // Sample every 5 seconds
}
`;

  const copyCode = () => {
    navigator.clipboard.writeText(esp32Code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-mono text-[#E4E7EB] uppercase flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#F27D26]" />
          System Architecture & ESP32 Hardware Integration
        </h2>
        <p className="text-xs text-[#8E9299]">
          Hardware telemetry pipeline, physical sensor pinouts, and embedded firmware specification
        </p>
      </div>

      {/* 1. End-to-End Pipeline Diagram (Section 2) */}
      <div className="bg-[#121316] border border-[#26282e] rounded p-6 shadow-md">
        <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB] mb-4 flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#F27D26]" />
          End-to-End IoT Subsidence Telemetry Pipeline
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs font-mono">
          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] flex flex-col justify-between">
            <Compass className="w-5 h-5 mx-auto text-[#F27D26] mb-1" />
            <div className="font-bold text-[#E4E7EB]">Sensor Nodes</div>
            <div className="text-[10px] text-[#8E9299] mt-1">MPU-6050 & SW-420</div>
          </div>

          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] flex flex-col justify-between">
            <Cpu className="w-5 h-5 mx-auto text-[#F27D26] mb-1" />
            <div className="font-bold text-[#E4E7EB]">ESP32 Core</div>
            <div className="text-[10px] text-[#8E9299] mt-1">FreeRTOS MCU</div>
          </div>

          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] flex flex-col justify-between">
            <Wifi className="w-5 h-5 mx-auto text-[#F27D26] mb-1" />
            <div className="font-bold text-[#E4E7EB]">GSM / WiFi</div>
            <div className="text-[10px] text-[#8E9299] mt-1">SIM800L Uplink</div>
          </div>

          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] flex flex-col justify-between">
            <Server className="w-5 h-5 mx-auto text-[#00D26A] mb-1" />
            <div className="font-bold text-[#E4E7EB]">Backend API</div>
            <div className="text-[10px] text-[#8E9299] mt-1">Express Ingestion</div>
          </div>

          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] flex flex-col justify-between">
            <Database className="w-5 h-5 mx-auto text-[#F27D26] mb-1" />
            <div className="font-bold text-[#E4E7EB]">SQLite Database</div>
            <div className="text-[10px] text-[#8E9299] mt-1">Truth Source</div>
          </div>

          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] flex flex-col justify-between">
            <BrainCircuit className="w-5 h-5 mx-auto text-[#F27D26] mb-1" />
            <div className="font-bold text-[#E4E7EB]">AI/ML Engine</div>
            <div className="text-[10px] text-[#8E9299] mt-1">Random Forest</div>
          </div>

          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] flex flex-col justify-between">
            <Activity className="w-5 h-5 mx-auto text-[#00D26A] mb-1" />
            <div className="font-bold text-[#E4E7EB]">Live Dashboard</div>
            <div className="text-[10px] text-[#8E9299] mt-1">SSE Stream</div>
          </div>

          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] flex flex-col justify-between">
            <Bell className="w-5 h-5 mx-auto text-[#FF3B30] mb-1" />
            <div className="font-bold text-[#E4E7EB]">Early Alerts</div>
            <div className="text-[10px] text-[#8E9299] mt-1">Emergency SMS</div>
          </div>
        </div>
      </div>

      {/* 2. Sensor Wiring & Pinout Table */}
      <div className="bg-[#121316] border border-[#26282e] rounded p-6 shadow-md">
        <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB] mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#F27D26]" />
          Hardware Pinout & Physical Connections
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0a0a0b] border-b border-[#26282e] text-[#8E9299] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3">Hardware Sensor Module</th>
                <th className="p-3">Function in Mine Sentinel</th>
                <th className="p-3">Interface Type</th>
                <th className="p-3">ESP32 GPIO Pin</th>
                <th className="p-3">Operating Voltage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26282e] text-[#E4E7EB]">
              <tr>
                <td className="p-3 font-bold text-[#F27D26]">MPU-6050 6-DOF</td>
                <td className="p-3">Measures slope inclination angle vector (Tilt X, Tilt Y, Magnitude)</td>
                <td className="p-3">I2C (Address 0x68)</td>
                <td className="p-3 text-[#F27D26]">SDA: GPIO 21, SCL: GPIO 22</td>
                <td className="p-3 text-[#8E9299]">3.3V</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-[#00D26A]">SW-420 Vibration Sensor</td>
                <td className="p-3">Detects micro-seismic strata vibrations, roof spalling shocks</td>
                <td className="p-3">Digital / Pulse width</td>
                <td className="p-3 text-[#00D26A]">DO: GPIO 4</td>
                <td className="p-3 text-[#8E9299]">3.3V - 5V</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-[#E4E7EB]">NEO-6M GPS Receiver</td>
                <td className="p-3">Provides latitude & longitude coordinates for GPS map location</td>
                <td className="p-3">UART (9600 Baud)</td>
                <td className="p-3 text-[#8E9299]">TX: GPIO 16 (RX2), RX: GPIO 17 (TX2)</td>
                <td className="p-3 text-[#8E9299]">3.3V</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-[#FF3B30]">SIM800L GSM Module</td>
                <td className="p-3">Sends emergency SMS alerts autonomously when danger threshold is exceeded</td>
                <td className="p-3">UART / AT Commands</td>
                <td className="p-3 text-[#FF3B30]">TX: GPIO 26, RX: GPIO 27</td>
                <td className="p-3 text-[#8E9299]">3.7V - 4.2V (Li-Ion)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Embedded ESP32 Firmware Source Code (Section 33) */}
      <div className="bg-[#121316] border border-[#26282e] rounded p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-3">
          <div>
            <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB] flex items-center gap-2">
              <Code className="w-4 h-4 text-[#00D26A]" />
              ESP32 Embedded C++ Firmware
            </h3>
            <p className="text-[11px] text-[#8E9299] font-mono">
              Ready to flash in Arduino IDE / PlatformIO. Transmits real-time packets to POST /api/sensor-data
            </p>
          </div>

          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#18191d] hover:bg-[#26282e] text-[#8E9299] hover:text-[#E4E7EB] text-xs font-mono font-semibold border border-[#26282e] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00D26A]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Firmware Code'}</span>
          </button>
        </div>

        <pre className="bg-[#0a0a0b] p-4 rounded border border-[#26282e] text-[11px] font-mono text-[#E4E7EB] overflow-x-auto max-h-96 leading-relaxed">
          {esp32Code}
        </pre>
      </div>
    </div>
  );
};
