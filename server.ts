import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  getDevices,
  getDevice,
  upsertDevice,
  deleteDevice,
  insertSensorReading,
  getLatestSensorData,
  getSensorHistory,
  getRecentReadingsAll,
  getSensorDataForDate,
  getSensorDataForDateRange,
  getAlertHistory,
  insertSmsAlert,
  getLatestRiskPrediction,
  getSystemStats,
  getSettings,
  updateSettings,
  getHighestTilt,
  getHighestVibration
} from './server/db.ts';
import { evaluateSubsidenceRisk } from './server/ml_engine.ts';
import { handleChatMessage } from './server/chatbot.ts';
import type { RiskLevel } from './src/types.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-Sent Events (SSE) Client registry for instant real-time telemetry updates
interface SSEClient {
  id: number;
  res: express.Response;
}
let sseClients: SSEClient[] = [];
let nextClientId = 1;

function broadcastUpdate(type: string, payload: any) {
  const data = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  sseClients.forEach(c => {
    try {
      c.res.write(`data: ${data}\n\n`);
    } catch {
      // client disconnected
    }
  });
}

// Background sensor simulator state
let simulatorInterval: NodeJS.Timeout | null = null;
let simulatorActive = false;
let simulatorScenario: 'normal' | 'increasing_tilt' | 'increasing_vibration' | 'warning' | 'danger' = 'normal';
let simCounter = 0;

async function startServer() {
  // Initialize SQLite database
  await initDatabase();

  // --- API ROUTES FIRST ---

  // Real-time Event Stream (SSE)
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = nextClientId++;
    sseClients.push({ id: clientId, res });

    // Send initial ping and stats
    res.write(`data: ${JSON.stringify({ type: 'connected', stats: getSystemStats() })}\n\n`);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
  });

  // 1. Hardware Data Input Endpoint (Section 3 & 28)
  // POST /api/sensor-data
  app.post('/api/sensor-data', (req, res) => {
    const body = req.body;

    // Validation
    if (!body || !body.device_id) {
      return res.status(400).json({ error: 'Missing device_id in request.' });
    }

    const device_id = String(body.device_id).trim().toUpperCase();
    const timestamp = body.timestamp ? new Date(body.timestamp).toISOString() : new Date().toISOString();
    const latitude = Number(body.latitude) || 10.7905;
    const longitude = Number(body.longitude) || 78.7047;
    const tilt_x = parseFloat(Number(body.tilt_x || 0).toFixed(3));
    const tilt_y = parseFloat(Number(body.tilt_y || 0).toFixed(3));
    const vibration = parseFloat(Number(body.vibration || 0).toFixed(3));
    const is_demo = Boolean(body.is_demo);

    // Compute tilt magnitude: sqrt(tilt_x^2 + tilt_y^2)
    const tilt_magnitude = parseFloat(Math.sqrt(tilt_x * tilt_x + tilt_y * tilt_y).toFixed(3));

    // Ensure device exists or auto-register from external hardware
    upsertDevice({
      device_id,
      device_name: body.device_name || `Hardware Node ${device_id}`,
      installation_location: body.installation_location || 'Mine Monitoring Grid',
      latitude,
      longitude,
      status: 'ONLINE',
      last_seen: timestamp
    });

    // 2. Run AI/ML Subsidence Risk Prediction Model
    const prediction = evaluateSubsidenceRisk(device_id, {
      tilt_x,
      tilt_y,
      tilt_magnitude,
      vibration,
      timestamp
    });

    // Handle SMS alert logic
    let sms_sent = Boolean(body.sms_sent);
    let sms_sent_time = body.sms_sent_time || (sms_sent ? timestamp : null);

    const settings = getSettings();
    if (!sms_sent && prediction.risk_level === 'DANGER' && settings.auto_sms_danger) {
      sms_sent = true;
      sms_sent_time = timestamp;
      insertSmsAlert({
        device_id,
        alert_type: 'CRITICAL DANGER ALERT',
        message: `Mine Sentinel: Urgent! ${device_id} triggered DANGER level (${prediction.risk_score}/100). Tilt: ${tilt_magnitude}°, Vib: ${vibration}. Ground movement warning dispatched.`,
        sent: true,
        sent_time: timestamp
      });
    } else if (sms_sent && body.sms_message) {
      insertSmsAlert({
        device_id,
        alert_type: prediction.risk_level === 'DANGER' ? 'DANGER ALERT' : 'WARNING ALERT',
        message: body.sms_message,
        sent: true,
        sent_time: sms_sent_time
      });
    }

    // 3. Store permanent reading in database
    insertSensorReading({
      device_id,
      timestamp,
      latitude,
      longitude,
      tilt_x,
      tilt_y,
      tilt_magnitude,
      vibration,
      risk_level: prediction.risk_level,
      risk_score: prediction.risk_score,
      sms_sent,
      sms_sent_time,
      is_demo
    });

    const newReading = {
      device_id,
      timestamp,
      latitude,
      longitude,
      tilt_x,
      tilt_y,
      tilt_magnitude,
      vibration,
      risk_level: prediction.risk_level,
      risk_score: prediction.risk_score,
      sms_sent,
      sms_sent_time,
      is_demo
    };

    // Broadcast to live dashboard via SSE
    broadcastUpdate('sensor_reading', {
      reading: newReading,
      prediction,
      stats: getSystemStats()
    });

    return res.status(201).json({
      status: 'success',
      message: 'Sensor data stored and analyzed successfully',
      reading: newReading,
      prediction
    });
  });

  // Devices endpoints
  app.get('/api/devices', (req, res) => {
    res.json(getDevices());
  });

  app.get('/api/devices/:device_id', (req, res) => {
    const dev = getDevice(req.params.device_id);
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    res.json(dev);
  });

  app.post('/api/devices', (req, res) => {
    const { device_id, device_name, installation_location, latitude, longitude } = req.body;
    if (!device_id || !device_name) {
      return res.status(400).json({ error: 'device_id and device_name are required' });
    }
    upsertDevice({
      device_id: device_id.trim().toUpperCase(),
      device_name: device_name.trim(),
      installation_location: installation_location || 'Mine Subsidence Area',
      latitude: Number(latitude) || 10.7905,
      longitude: Number(longitude) || 78.7047,
      status: 'ONLINE'
    });
    broadcastUpdate('devices_updated', getDevices());
    res.status(201).json({ status: 'created', device: getDevice(device_id.trim().toUpperCase()) });
  });

  app.put('/api/devices/:device_id', (req, res) => {
    const { device_name, installation_location, latitude, longitude, status } = req.body;
    upsertDevice({
      device_id: req.params.device_id,
      device_name,
      installation_location,
      latitude: Number(latitude),
      longitude: Number(longitude),
      status
    });
    broadcastUpdate('devices_updated', getDevices());
    res.json({ status: 'updated', device: getDevice(req.params.device_id) });
  });

  app.delete('/api/devices/:device_id', (req, res) => {
    deleteDevice(req.params.device_id);
    broadcastUpdate('devices_updated', getDevices());
    res.json({ status: 'deleted', device_id: req.params.device_id });
  });

  app.get('/api/devices/:device_id/latest', (req, res) => {
    const data = getLatestSensorData(req.params.device_id);
    if (!data) return res.status(404).json({ message: 'No readings found for this device.' });
    res.json(data);
  });

  app.get('/api/devices/:device_id/history', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = getSensorHistory(req.params.device_id, limit);
    res.json(history);
  });

  // Date and Date Range queries
  app.get('/api/sensor-data/date', (req, res) => {
    const device_id = (req.query.device_id as string) || 'NODE-001';
    const date = (req.query.date as string) || '2026-08-25';
    const readings = getSensorDataForDate(device_id, date);
    res.json({
      device_id,
      date,
      count: readings.length,
      readings
    });
  });

  app.get('/api/sensor-data/range', (req, res) => {
    const device_id = (req.query.device_id as string) || 'NODE-001';
    const start_date = (req.query.start_date as string) || '2026-08-20';
    const end_date = (req.query.end_date as string) || '2026-09-02';
    const readings = getSensorDataForDateRange(device_id, start_date, end_date);

    // Calculate summary statistics
    let maxTilt = 0;
    let maxVibration = 0;
    let warningCount = 0;
    let dangerCount = 0;
    let smsAlertsCount = 0;

    for (const r of readings) {
      if (r.tilt_magnitude > maxTilt) maxTilt = r.tilt_magnitude;
      if (r.vibration > maxVibration) maxVibration = r.vibration;
      if (r.risk_level === 'WARNING') warningCount++;
      if (r.risk_level === 'DANGER') dangerCount++;
      if (r.sms_sent) smsAlertsCount++;
    }

    res.json({
      device_id,
      start_date,
      end_date,
      count: readings.length,
      statistics: {
        max_tilt: maxTilt,
        max_vibration: maxVibration,
        warning_count: warningCount,
        danger_count: dangerCount,
        sms_alerts_count: smsAlertsCount
      },
      readings
    });
  });

  // Recent readings all
  app.get('/api/sensor-data/recent', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    res.json(getRecentReadingsAll(limit));
  });

  // Map Devices endpoint
  app.get('/api/map/devices', (req, res) => {
    const devices = getDevices();
    const mapNodes = devices.map(d => ({
      device_id: d.device_id,
      device_name: d.device_name,
      installation_location: d.installation_location,
      latitude: d.latitude,
      longitude: d.longitude,
      status: d.status,
      current_tilt: d.current_tilt,
      current_vibration: d.current_vibration,
      risk_level: d.current_risk_level,
      risk_score: d.current_risk_score,
      last_seen: d.last_seen
    }));
    res.json(mapNodes);
  });

  // Alerts endpoint
  app.get('/api/alerts', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json(getAlertHistory(limit));
  });

  app.post('/api/alerts/test', (req, res) => {
    const { device_id, alert_type, message } = req.body;
    const time = new Date().toISOString();
    insertSmsAlert({
      device_id: device_id || 'NODE-001',
      alert_type: alert_type || 'MANUAL DRILL ALERT',
      message: message || `Mine Sentinel Test Alert dispatched to geotechnical safety group. Time: ${time}`,
      sent: true,
      sent_time: time
    });
    broadcastUpdate('new_alert', { device_id, time });
    res.json({ status: 'sent', time });
  });

  // Risk prediction endpoint
  app.get('/api/risk/:device_id', (req, res) => {
    const pred = getLatestRiskPrediction(req.params.device_id);
    if (!pred) return res.status(404).json({ message: 'No prediction found for this device.' });
    res.json(pred);
  });

  // Stats
  app.get('/api/stats', (req, res) => {
    res.json(getSystemStats());
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    res.json(getSettings());
  });

  app.post('/api/settings', (req, res) => {
    const updated = updateSettings(req.body);
    broadcastUpdate('settings_updated', updated);
    res.json(updated);
  });

  // AI Chatbot endpoint
  app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message string required.' });
    }
    try {
      const response = await handleChatMessage(message);
      res.json(response);
    } catch (err: any) {
      console.error('Chat error:', err);
      res.status(500).json({
        text: 'An error occurred while querying Mine Sentinel data. Please try again.',
        toolsUsed: []
      });
    }
  });

  // Hardware Sensor Simulator Endpoints (Section 31)
  app.post('/api/simulator/send', (req, res) => {
    const { device_id, scenario } = req.body;
    const targetDev = device_id || 'NODE-001';
    const now = new Date().toISOString();
    const dev = getDevice(targetDev) || { latitude: 10.7905, longitude: 78.7047 };

    let tilt_x = 0.3;
    let tilt_y = 0.2;
    let vibration = 0.5;
    simCounter++;

    if (scenario === 'increasing_tilt') {
      tilt_x = 1.0 + (simCounter * 0.15);
      tilt_y = 0.8 + (simCounter * 0.12);
      vibration = 1.2 + Math.random() * 0.4;
    } else if (scenario === 'increasing_vibration') {
      tilt_x = 0.5;
      tilt_y = 0.4;
      vibration = 2.0 + (simCounter * 0.3);
    } else if (scenario === 'warning') {
      tilt_x = 1.3;
      tilt_y = 0.9;
      vibration = 2.2;
    } else if (scenario === 'danger') {
      tilt_x = 2.6;
      tilt_y = 1.8;
      vibration = 3.8;
    } else {
      // Normal
      tilt_x = 0.3 + (Math.random() * 0.2);
      tilt_y = 0.2 + (Math.random() * 0.15);
      vibration = 0.4 + (Math.random() * 0.3);
    }

    const tilt_mag = parseFloat(Math.sqrt(tilt_x * tilt_x + tilt_y * tilt_y).toFixed(3));
    tilt_x = parseFloat(tilt_x.toFixed(3));
    tilt_y = parseFloat(tilt_y.toFixed(3));
    vibration = parseFloat(vibration.toFixed(3));

    // Evaluate risk
    const prediction = evaluateSubsidenceRisk(targetDev, {
      tilt_x,
      tilt_y,
      tilt_magnitude: tilt_mag,
      vibration,
      timestamp: now
    });

    const isDanger = prediction.risk_level === 'DANGER';
    insertSensorReading({
      device_id: targetDev,
      timestamp: now,
      latitude: dev.latitude,
      longitude: dev.longitude,
      tilt_x,
      tilt_y,
      tilt_magnitude: tilt_mag,
      vibration,
      risk_level: prediction.risk_level,
      risk_score: prediction.risk_score,
      sms_sent: isDanger,
      sms_sent_time: isDanger ? now : null,
      is_demo: true
    });

    if (isDanger) {
      insertSmsAlert({
        device_id: targetDev,
        alert_type: 'DEMO DANGER ALERT',
        message: `[DEMO DATA] Mine Sentinel simulated DANGER condition on ${targetDev}. Tilt: ${tilt_mag}°, Vib: ${vibration}.`,
        sent: true,
        sent_time: now
      });
    }

    const readingPayload = {
      device_id: targetDev,
      timestamp: now,
      latitude: dev.latitude,
      longitude: dev.longitude,
      tilt_x,
      tilt_y,
      tilt_magnitude: tilt_mag,
      vibration,
      risk_level: prediction.risk_level,
      risk_score: prediction.risk_score,
      sms_sent: isDanger,
      sms_sent_time: isDanger ? now : null,
      is_demo: true
    };

    broadcastUpdate('sensor_reading', {
      reading: readingPayload,
      prediction,
      stats: getSystemStats()
    });

    res.json({
      status: 'simulated',
      reading: readingPayload,
      prediction
    });
  });

  app.post('/api/simulator/toggle', (req, res) => {
    const { active, scenario } = req.body;
    if (scenario) simulatorScenario = scenario;

    if (active && !simulatorInterval) {
      simulatorActive = true;
      simulatorInterval = setInterval(() => {
        const devices = getDevices();
        if (devices.length === 0) return;
        // cycle through devices or target NODE-001
        const dev = devices[simCounter % devices.length];
        simCounter++;

        let tilt_x = 0.35;
        let tilt_y = 0.25;
        let vibration = 0.6;

        if (simulatorScenario === 'increasing_tilt') {
          tilt_x = 0.8 + ((simCounter % 15) * 0.12);
          tilt_y = 0.6 + ((simCounter % 15) * 0.09);
          vibration = 1.1 + Math.random() * 0.4;
        } else if (simulatorScenario === 'increasing_vibration') {
          tilt_x = 0.4;
          tilt_y = 0.3;
          vibration = 1.5 + ((simCounter % 12) * 0.25);
        } else if (simulatorScenario === 'warning') {
          tilt_x = 1.25;
          tilt_y = 0.85;
          vibration = 2.1;
        } else if (simulatorScenario === 'danger') {
          tilt_x = 2.4;
          tilt_y = 1.7;
          vibration = 3.6;
        } else {
          // Normal
          tilt_x = 0.3 + (Math.random() * 0.25);
          tilt_y = 0.2 + (Math.random() * 0.2);
          vibration = 0.45 + (Math.random() * 0.35);
        }

        const now = new Date().toISOString();
        const tilt_mag = parseFloat(Math.sqrt(tilt_x * tilt_x + tilt_y * tilt_y).toFixed(3));
        tilt_x = parseFloat(tilt_x.toFixed(3));
        tilt_y = parseFloat(tilt_y.toFixed(3));
        vibration = parseFloat(vibration.toFixed(3));

        const prediction = evaluateSubsidenceRisk(dev.device_id, {
          tilt_x,
          tilt_y,
          tilt_magnitude: tilt_mag,
          vibration,
          timestamp: now
        });

        const isDanger = prediction.risk_level === 'DANGER';
        insertSensorReading({
          device_id: dev.device_id,
          timestamp: now,
          latitude: dev.latitude,
          longitude: dev.longitude,
          tilt_x,
          tilt_y,
          tilt_magnitude: tilt_mag,
          vibration,
          risk_level: prediction.risk_level,
          risk_score: prediction.risk_score,
          sms_sent: isDanger,
          sms_sent_time: isDanger ? now : null,
          is_demo: true
        });

        broadcastUpdate('sensor_reading', {
          reading: {
            device_id: dev.device_id,
            timestamp: now,
            latitude: dev.latitude,
            longitude: dev.longitude,
            tilt_x,
            tilt_y,
            tilt_magnitude: tilt_mag,
            vibration,
            risk_level: prediction.risk_level,
            risk_score: prediction.risk_score,
            sms_sent: isDanger,
            is_demo: true
          },
          prediction,
          stats: getSystemStats()
        });
      }, 4000);
    } else if (!active && simulatorInterval) {
      clearInterval(simulatorInterval);
      simulatorInterval = null;
      simulatorActive = false;
    }

    res.json({
      active: simulatorActive,
      scenario: simulatorScenario
    });
  });

  app.get('/api/simulator/status', (req, res) => {
    res.json({
      active: simulatorActive,
      scenario: simulatorScenario
    });
  });

  // --- VITE MIDDLEWARE (Section 3 of React Setup Guidelines) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mine Sentinel server active on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
