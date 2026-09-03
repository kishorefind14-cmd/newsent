import { GoogleGenAI } from '@google/genai';
import {
  getDevice,
  getDevices,
  getLatestSensorData,
  getSensorHistory,
  getSensorDataForDate,
  getSensorDataForDateRange,
  getAlertHistory,
  getLatestRiskPrediction,
  getHighestVibration,
  getHighestTilt,
  getSystemStats,
  normalizeDateInput
} from './db.ts';
import type { ChatGraphData } from '../src/types.ts';

const DEFAULT_GEMINI_KEY = 'AQ.Ab8RN6JSYXt-unQnYoCU32uvtI4_yo5h6bYgZdzPadkadV03cg';
export const REFUSAL_MESSAGE = "I can't tell that. I am Sentinal, the Mine Sentinel AI assistant. I only answer questions regarding the Mine Sentinel application, its features, and sensor database telemetry.";

// Gemini client initialization (lazy / safe)
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
  if (!geminiClient && apiKey) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

// Controlled Tool Functions (Section 20)
export const tools = {
  get_device_status: (device_id: string) => {
    const dev = getDevice(device_id);
    if (!dev) return { error: `Device ${device_id} not found.` };
    const latest = getLatestSensorData(device_id);
    const pred = getLatestRiskPrediction(device_id);
    return {
      device_id: dev.device_id,
      name: dev.device_name,
      status: dev.status,
      location: dev.installation_location,
      current_risk_level: dev.current_risk_level,
      current_risk_score: dev.current_risk_score,
      current_tilt: dev.current_tilt,
      current_vibration: dev.current_vibration,
      last_seen: dev.last_seen,
      latest_reading: latest,
      latest_prediction: pred?.prediction_reason
    };
  },

  get_latest_sensor_data: (device_id?: string) => {
    const data = getLatestSensorData(device_id);
    if (!data) return { message: `No sensor data found${device_id ? ` for ${device_id}` : ''}.` };
    return data;
  },

  get_sensor_history: (device_id: string, limit = 20) => {
    const history = getSensorHistory(device_id, limit);
    return history.length ? history : { message: `No historical data for ${device_id}.` };
  },

  get_data_for_date: (device_id: string, date: string) => {
    const readings = getSensorDataForDate(device_id, date);
    if (!readings || readings.length === 0) {
      return { message: `No data is available for ${device_id} on ${date}.` };
    }
    return readings;
  },

  get_data_for_date_range: (device_id: string, start_date: string, end_date: string) => {
    const readings = getSensorDataForDateRange(device_id, start_date, end_date);
    if (!readings || readings.length === 0) {
      return { message: `No data is available for ${device_id} between ${start_date} and ${end_date}.` };
    }
    return readings;
  },

  get_highest_vibration: () => {
    const record = getHighestVibration();
    if (!record) return { message: 'No vibration records found in database.' };
    return record;
  },

  get_highest_tilt: () => {
    const record = getHighestTilt();
    if (!record) return { message: 'No tilt records found in database.' };
    return record;
  },

  get_alert_history: (limit = 20) => {
    return getAlertHistory(limit);
  },

  get_risk_prediction: (device_id: string) => {
    const pred = getLatestRiskPrediction(device_id);
    if (!pred) return { message: `No risk prediction record found for ${device_id}.` };
    return pred;
  },

  get_device_location: (device_id: string) => {
    const dev = getDevice(device_id);
    if (!dev) return { message: `Device ${device_id} not found.` };
    return {
      device_id: dev.device_id,
      device_name: dev.device_name,
      location: dev.installation_location,
      latitude: dev.latitude,
      longitude: dev.longitude
    };
  }
};

/**
 * Filter for off-topic, unwanted queries
 */
function isOffTopicQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  const offTopicPatterns = [
    /\b(recipe|cook|bake|cake|cookie|pasta|pizza|soup|ingredient|kitchen|sandwich)\b/i,
    /\b(president|prime minister|election|senate|congress|politics|political|democrat|republican)\b/i,
    /\b(movie|film|actor|actress|hollywood|netflix|oscars|song|singer|music band|rap|album|spotify)\b/i,
    /\b(football|basketball|soccer|cricket|nba|nfl|world cup|olympics|championship|tennis)\b/i,
    /\b(weather in|weather of|temperature in)\s+(paris|london|tokyo|new york|california|mumbai|delhi|sydney|beijing|texas|florida|[a-z]+)/i,
    /\b(write a poem|write a song|write a story|tell me a joke|tell a joke|tell a story)\b/i,
    /\b(capital of|who is the king|who is the queen|who is elon musk|who is bill gates|who created you)\b/i,
    /\b(how to code python game|write a javascript game|solve leetcode|write a c\+\+ program for|react tutorial)\b/i,
    /\b(what is love|meaning of life|relationship advice|astrology|horoscope|zodiac)\b/i
  ];
  return offTopicPatterns.some(pattern => pattern.test(q));
}

/**
 * Build rich, live SQLite database telemetry context for Sentinal
 */
function buildLiveDatabaseContext(query: string): string {
  const devices = getDevices();
  const highestVib = getHighestVibration();
  const highestTilt = getHighestTilt();
  const alerts = getAlertHistory(10);
  const stats = getSystemStats();

  let context = `REAL-TIME DATABASE TELEMETRY & SYSTEM STATE:
- Total Deployed Nodes: ${devices.length}
- Safe Nodes: ${stats.safe_devices}, Warning Nodes: ${stats.warning_devices}, Danger Nodes: ${stats.danger_devices}
- Total Sensor Readings in SQLite: ${stats.total_readings}
- Total Alerts Logged: ${stats.total_alerts}

DEPLOYED SENSOR NODES & LIVE STATUS:
${devices
  .map(
    d =>
      `- ${d.device_id} ("${d.device_name}"):
   Location: ${d.installation_location} (GPS: ${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)})
   Status: ${d.status}, Current Risk: ${d.current_risk_level || 'NORMAL'} (${d.current_risk_score ?? 0}/100)
   Current Tilt: ${d.current_tilt ?? 0}°
   Current Vibration: ${d.current_vibration ?? 0}
   Last Telemetry Packet: ${d.last_seen}`
  )
  .join('\n')}

DATABASE EXTREMES & RECORDS:
- Highest Vibration Recorded: ${highestVib ? `${highestVib.vibration} on ${highestVib.device_id} (timestamp: ${highestVib.timestamp})` : 'N/A'}
- Highest Tilt Magnitude Recorded: ${highestTilt ? `${highestTilt.tilt_magnitude}° on ${highestTilt.device_id} (timestamp: ${highestTilt.timestamp})` : 'N/A'}

RECENT ALERTS IN DATABASE:
${
  alerts.slice(0, 5).map(
    a => `- [${a.alert_type}] ${a.device_id}: "${a.message}" (Logged: ${a.sent_time || a.created_at})`
  ).join('\n') || 'No alerts recorded in database.'
}`;

  // If a specific date is mentioned in the query
  const dateMatch = query.match(/(\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    const rawDate = dateMatch[1].replace(/(st|nd|rd|th)/g, '');
    const normDate = normalizeDateWithYear(rawDate);
    const readings = getSensorDataForDate('NODE-001', normDate);
    if (readings && readings.length > 0) {
      const tilts = readings.map(r => r.tilt_magnitude);
      const vibs = readings.map(r => r.vibration);
      const maxTilt = Math.max(...tilts);
      const maxVib = Math.max(...vibs);
      const dangers = readings.filter(r => r.risk_level === 'DANGER').length;
      context += `\n\nDATABASE INSPECTION FOR DATE ${normDate}:
- Total sensor readings recorded on ${normDate}: ${readings.length}
- Max Tilt Magnitude on ${normDate}: ${maxTilt.toFixed(2)}°
- Max Vibration on ${normDate}: ${maxVib.toFixed(2)}
- Danger events triggered on ${normDate}: ${dangers}`;
    }
  }

  return context;
}

/**
 * Handle incoming user chat message with controlled tools and graph generation
 */
export async function handleChatMessage(userMessage: string): Promise<{
  text: string;
  graph?: ChatGraphData;
  toolsUsed: string[];
}> {
  const toolsUsed: string[] = [];
  const query = userMessage.trim().toLowerCase();

  // 1. Strict guardrail for unwanted/off-topic questions
  if (isOffTopicQuery(query)) {
    return {
      text: REFUSAL_MESSAGE,
      toolsUsed: []
    };
  }

  // 2. Detect graph requests (interactive Recharts graph generation)
  const graphResult = parseAndExecuteGraphRequest(userMessage);
  if (graphResult) {
    toolsUsed.push(graphResult.tool);
    return {
      text: graphResult.text,
      graph: graphResult.graph,
      toolsUsed
    };
  }

  // 3. Query Gemini with full app knowledge and live SQLite database telemetry
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const liveContext = buildLiveDatabaseContext(userMessage);
      const systemPrompt = `You are Sentinal, the dedicated AI assistant for the Mine Sentinel geotechnical safety and subsidence monitoring application.

YOUR IDENTITY:
- Your name is explicitly "Sentinal".
- You are knowledgeable, precise, and professional.

WHAT YOU KNOW:
You know all details of the Mine Sentinel application:
1. APPLICATION PURPOSE:
   - Mine Sentinel is an AI-powered real-time monitoring and early warning system designed to detect, track, predict, and alert against underground coal mine surface subsidence, strata movement, and slope collapse.
   - Deployed at Coal Block 4, South Overburden Division.

2. APPLICATION MODULES & VIEWS:
   - Dashboard: Real-time status cards (Active Nodes, Risk Level, Alerts Dispatched, LoRaWAN Telemetry Status), live summary feeds, and current risk indicators.
   - Live Monitoring: Geospatial satellite view using Leaflet.js with interactive colored markers (Green=Safe, Orange=Warning, Red=Danger) displaying sensor positions. Real-time vector charts for dual-axis tilt (X, Y, Magnitude) and vibration, with trend indicators (Increasing, Decreasing, Stable).
   - AI Risk Prediction: Advanced machine learning evaluation engine that analyzes tilt rate of change, vibration velocity, displacement acceleration, and strata integrity to produce a 0-100 risk score and categorize risk as SAFE, WARNING, or DANGER.
   - Historical Analysis: Temporal database search allowing single-date inspection (e.g., 25 August 2026, 28 August 2026, 1 September 2026) or date range queries (e.g., 20 August to 30 August 2026), extreme statistics (min, max, average), and CSV export.
   - Alerts & SMS: Real-time and historical safety alert log, SMS alert dispatch tracking to safety teams, and emergency drill trigger.
   - Devices: Detailed inventory of all 5 deployed telemetry nodes (NODE-001 through NODE-005), online/offline status, GPS coordinates, battery voltages, and installation sites.
   - Hardware Simulator: Interactive demo tool that streams synthetic geological events (Normal Baseline, Warning Condition, Critical Danger Spike, Progressively Increasing Tilt, Increasing Vibration) to demonstrate live system response.
   - Reports: Compliance report generator producing audit summaries adhering to DGMS (Directorate General of Mines Safety) and OSHA standards.
   - Settings: Configurable threshold limits, alert recipient phone numbers, and polling frequencies.
   - Sentinal Chatbot: You! A direct conversational interface to telemetry data with in-chat interactive chart rendering.

3. HARDWARE & SENSORS:
   - Sensor Nodes:
     * NODE-001: Overburden Bench Node Alpha (Shaft 4 South Overburden Slope, Panel A-12, Lat: 10.7905, Lng: 78.7047).
     * NODE-002: Longwall Extraction Surface Monitor (Longwall Panel B Surface Subsidence Center, Lat: 10.7942, Lng: 78.7089).
     * NODE-003: Haul Road Embankment Guard (East Haulage Corridor Embankment KM 4.2, Lat: 10.7860, Lng: 78.7012).
     * NODE-004: Ventilation Fan Surface Pad (Upcast Ventilation Shaft 2 Concrete Collar, Lat: 10.7980, Lng: 78.7030).
     * NODE-005: Tailings Dam Crest Inclinometer (West Tailing Dam Crest Station 08, Lat: 10.7820, Lng: 78.7120).
   - Onboard Sensors:
     * Dual-Axis MEMS Inclinometers (Tilt X and Tilt Y in degrees; total Tilt Magnitude = sqrt(Tilt_X^2 + Tilt_Y^2)).
     * Geophone Velocity Transducers (detects seismic tremors and ground vibrations in mm/s).
     * High-Precision GNSS / GPS module for surface displacement measurement.
     * Solar panel with LiFePO4 battery pack for continuous field operation.
     * LoRaWAN and 4G cellular telemetry modem for real-time data transmission.

4. SAFETY THRESHOLDS & RISK CRITERIA:
   - SAFE (Green): Tilt Magnitude < 1.0°, Vibration < 1.5, Risk Score 0–39. Normal mine activity.
   - WARNING (Orange): Tilt Magnitude 1.0°–2.0°, or Vibration 1.5–2.5, Risk Score 40–69. Elevated strata stress; safety inspection alerted.
   - DANGER (Red): Tilt Magnitude > 2.0° or Vibration > 2.5, Risk Score 70–100. Critical subsidence risk; automatic SMS dispatched to emergency response teams and evacuation protocol triggered.

5. DATABASE & PREVIOUS DATA:
${liveContext}

STRICT GUARDRAIL & REFUSAL DIRECTIVE:
- You must ONLY answer questions regarding:
  1. The Mine Sentinel application, its features, modules, views, architecture, and settings.
  2. The hardware sensors (MEMS inclinometers, geophones, GPS, LoRaWAN, thresholds, and nodes).
  3. The database telemetry (current readings, previous data, historical trends, alert history, device status).
- IF THE USER ASKS ANY OTHER OR UNWANTED QUESTION (including general trivia, history, recipes, jokes, poems, creative writing, programming unrelated to this app, politics, sports, non-mine weather, general chitchat):
  YOU MUST REFUSE AND ANSWER EXACTLY:
  "I can't tell that. I am Sentinal, the Mine Sentinel AI assistant. I only answer questions regarding the Mine Sentinel application, its features, and sensor database telemetry."
- Do not provide any answer to unwanted questions, not even a partial or polite answer. Always state "I can't tell that."`;

      // Try preferred models with fallback
      const candidateModels = ['gemini-flash-latest', 'gemini-3.1-flash-lite'];
      for (const model of candidateModels) {
        try {
          const response = await gemini.models.generateContent({
            model,
            contents: userMessage,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.1
            }
          });

          const responseText = response.text;
          if (responseText) {
            return {
              text: responseText.trim(),
              toolsUsed: [model, 'sqlite_db_grounding']
            };
          }
        } catch (mErr: any) {
          console.warn(`Model ${model} attempt failed, trying next:`, mErr?.message || mErr);
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to deterministic domain assistant:', err);
    }
  }

  // 4. Resilient deterministic domain engine for on-topic questions if Gemini is unavailable
  // A. Status of a specific node
  const statusMatch = query.match(/status of (node-?\d{1,3})/i) || query.match(/(node-?\d{1,3}) status/i);
  if (statusMatch) {
    const devId = formatDeviceId(statusMatch[1]);
    toolsUsed.push('get_device_status');
    const statusData = tools.get_device_status(devId);
    if ('error' in statusData) {
      return { text: `Device ${devId} was not found in the database. Available nodes: NODE-001 through NODE-005.`, toolsUsed };
    }
    return {
      text: `${statusData.device_id} (${statusData.name}) is currently in ${statusData.current_risk_level} status. Current tilt is ${statusData.current_tilt ?? 0}° and vibration is ${statusData.current_vibration ?? 0}. The risk score is ${statusData.current_risk_score ?? 0}/100. ${statusData.latest_prediction ? `\n\nAI Assessment: ${statusData.latest_prediction}` : ''}`,
      toolsUsed
    };
  }

  // B. Highest vibration
  if (query.includes('highest vibration') || query.includes('max vibration') || query.includes('most vibration')) {
    toolsUsed.push('get_highest_vibration');
    const record = tools.get_highest_vibration();
    if ('message' in record) return { text: record.message, toolsUsed };
    return {
      text: `The highest vibration recorded in the database is ${record.vibration} on ${record.device_id} (timestamp: ${formatDateTime(record.timestamp)}).`,
      toolsUsed
    };
  }

  // C. Highest tilt
  if (query.includes('highest tilt') || query.includes('max tilt') || query.includes('maximum tilt')) {
    toolsUsed.push('get_highest_tilt');
    const record = tools.get_highest_tilt();
    if ('message' in record) return { text: record.message, toolsUsed };
    return {
      text: `The highest tilt magnitude recorded is ${record.tilt_magnitude}° on ${record.device_id} (timestamp: ${formatDateTime(record.timestamp)}).`,
      toolsUsed
    };
  }

  // D. Danger alerts & stats
  if (query.includes('danger alert') || query.includes('alerts') || query.includes('how many danger')) {
    toolsUsed.push('get_alert_history');
    const alerts = tools.get_alert_history(50);
    const dangerCount = alerts.filter(a => a.alert_type.toUpperCase().includes('DANGER') || a.message.toUpperCase().includes('DANGER')).length;
    const warningCount = alerts.filter(a => a.alert_type.toUpperCase().includes('WARNING') || a.message.toUpperCase().includes('WARNING')).length;
    return {
      text: `There are ${dangerCount} DANGER alert(s) and ${warningCount} WARNING alert(s) logged in the database. The most recent alert was for ${alerts[0]?.device_id || 'N/A'}: "${alerts[0]?.message || 'No alerts'}".`,
      toolsUsed
    };
  }

  // E. Location inquiry
  const locMatch = query.match(/(?:where is|location of|gps (?:of|for)) (node-?\d{1,3})/i);
  if (locMatch) {
    const devId = formatDeviceId(locMatch[1]);
    toolsUsed.push('get_device_location');
    const loc = tools.get_device_location(devId);
    if ('message' in loc) return { text: loc.message, toolsUsed };
    return {
      text: `${loc.device_id} is installed at: ${loc.location}.\nGPS Coordinates: Latitude ${loc.latitude.toFixed(4)}, Longitude ${loc.longitude.toFixed(4)}.`,
      toolsUsed
    };
  }

  // F. Danger thresholds inquiry
  if (query.includes('threshold') || query.includes('danger limit') || query.includes('safe limit')) {
    return {
      text: `Mine Sentinel Safety Thresholds:\n- SAFE: Tilt < 1.0°, Vibration < 1.5, Risk Score 0–39\n- WARNING: Tilt 1.0°–2.0°, Vibration 1.5–2.5, Risk Score 40–69\n- DANGER: Tilt > 2.0° or Vibration > 2.5, Risk Score 70–100 (Dispatches automatic SMS alerts to mine emergency teams).`,
      toolsUsed: ['threshold_rules']
    };
  }

  // G. App details inquiry
  if (query.includes('what is this app') || query.includes('about the app') || query.includes('app details') || query.includes('what do you do') || query.includes('features')) {
    const devices = getDevices();
    return {
      text: `I am Sentinal, the AI assistant for Mine Sentinel. Mine Sentinel is an AI-powered real-time underground coal mine subsidence monitoring, prediction, and early warning system.\n\nKey capabilities:\n- Real-time IoT telemetry from 5 deployed sensor nodes (${devices.map(d => d.device_id).join(', ')})\n- Dual-axis MEMS inclinometers and geophone vibration analysis\n- Automated risk scoring and subsidence prediction\n- Historical data query and in-chat interactive graphs\n- Instant SMS alerts on critical geotechnical hazards\n- Hardware sensor simulation and compliance reporting`,
      toolsUsed: ['get_device_status']
    };
  }

  // If query is something else not recognized as app-related, refuse per user instruction
  return {
    text: REFUSAL_MESSAGE,
    toolsUsed: []
  };
}

function parseAndExecuteGraphRequest(message: string): { text: string; graph: ChatGraphData; tool: string } | null {
  const q = message.toLowerCase();
  const isGraphQuery =
    q.includes('graph') ||
    q.includes('plot') ||
    q.includes('chart') ||
    q.includes('show tilt') ||
    q.includes('show vibration') ||
    q.includes('show data for') ||
    q.includes('show me the tilt') ||
    q.includes('show node-');

  if (!isGraphQuery) return null;

  // Extract Device ID
  const devMatch = q.match(/node-?(\d{1,3})/i);
  const deviceId = devMatch ? formatDeviceId(devMatch[0]) : 'NODE-001';

  // Determine sensor type
  let sensorType: 'tilt' | 'vibration' | 'risk' | 'combined' = 'tilt';
  if ((q.includes('tilt') && q.includes('vibration')) || q.includes('both') || q.includes('combined')) {
    sensorType = 'combined';
  } else if (q.includes('vibration') || q.includes('vib')) {
    sensorType = 'vibration';
  } else if (q.includes('risk')) {
    sensorType = 'risk';
  } else {
    sensorType = 'tilt';
  }

  // Check for date range: e.g. "from 20 August to 30 August" or "2026-08-20 to 2026-08-30"
  const rangeMatch = q.match(/from (\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+|\d{4}-\d{2}-\d{2})\s+to\s+(\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+|\d{4}-\d{2}-\d{2})/i);
  if (rangeMatch) {
    const rawStart = rangeMatch[1].replace(/(st|nd|rd|th)/g, '');
    const rawEnd = rangeMatch[2].replace(/(st|nd|rd|th)/g, '');
    const startIso = normalizeDateWithYear(rawStart);
    const endIso = normalizeDateWithYear(rawEnd);

    const readings = tools.get_data_for_date_range(deviceId, startIso, endIso);
    if (!Array.isArray(readings) || readings.length === 0) {
      return {
        text: `No data is available for ${deviceId} between ${startIso} and ${endIso}.`,
        tool: 'get_data_for_date_range',
        graph: {
          type: sensorType,
          device_id: deviceId,
          title: `${deviceId} - No Data Available`,
          data: []
        }
      };
    }

    const chartPoints = readings.map(r => ({
      time: formatTimeOnly(r.timestamp),
      timestamp: r.timestamp,
      tilt: r.tilt_magnitude,
      tilt_x: r.tilt_x,
      tilt_y: r.tilt_y,
      vibration: r.vibration,
      risk_score: r.risk_score
    }));

    return {
      text: `Retrieved ${readings.length} readings for ${deviceId} from ${startIso} to ${endIso}. Displaying the requested ${sensorType.toUpperCase()} graph below:`,
      tool: 'get_data_for_date_range',
      graph: {
        type: sensorType,
        device_id: deviceId,
        date: `${startIso} to ${endIso}`,
        title: `${deviceId} ${sensorType.toUpperCase()} History (${startIso} - ${endIso})`,
        data: chartPoints
      }
    };
  }

  // Check for specific single date: "25 August 2026", "28 August", "September 1", "2026-08-25"
  const dateMatch =
    q.match(/on (\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2})/i) ||
    q.match(/for (\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2})/i) ||
    q.match(/for ([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?)/i) ||
    q.match(/on ([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?)/i);

  let dateStr = '2026-08-25'; // default requested in prompt
  if (dateMatch) {
    const rawDate = dateMatch[1].replace(/(st|nd|rd|th)/g, '');
    dateStr = normalizeDateWithYear(rawDate);
  }

  const readings = tools.get_data_for_date(deviceId, dateStr);
  if (!Array.isArray(readings) || readings.length === 0) {
    return {
      text: `No data is available for ${deviceId} on ${dateStr}.`,
      tool: 'get_data_for_date',
      graph: {
        type: sensorType,
        device_id: deviceId,
        date: dateStr,
        title: `${deviceId} - No Data on ${dateStr}`,
        data: []
      }
    };
  }

  const chartPoints = readings.map(r => ({
    time: formatTimeOnly(r.timestamp),
    timestamp: r.timestamp,
    tilt: r.tilt_magnitude,
    tilt_x: r.tilt_x,
    tilt_y: r.tilt_y,
    vibration: r.vibration,
    risk_score: r.risk_score
  }));

  return {
    text: `Retrieved ${readings.length} readings for ${deviceId} on ${dateStr}. Showing the interactive ${sensorType} analysis graph:`,
    tool: 'get_data_for_date',
    graph: {
      type: sensorType,
      device_id: deviceId,
      date: dateStr,
      title: `${deviceId} ${sensorType.toUpperCase()} Graph (${dateStr})`,
      data: chartPoints
    }
  };
}

function formatDeviceId(str: string): string {
  const clean = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const numMatch = clean.match(/NODE(\d+)/) || clean.match(/(\d+)/);
  if (numMatch) {
    const n = numMatch[1].padStart(3, '0');
    return `NODE-${n}`;
  }
  return 'NODE-001';
}

function normalizeDateWithYear(str: string): string {
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return str.trim();
  // Append 2026 if year missing
  let withYear = str.trim();
  if (!/\b202\d\b/.test(withYear)) {
    withYear = `${withYear} 2026`;
  }
  const d = new Date(withYear);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return normalizeDateInput(str);
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function formatTimeOnly(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return iso.substring(11, 16);
  }
}
