import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import type { Device, SensorReading, SmsAlert, RiskPrediction, User, SystemStats, SystemSettings } from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'mine_sentinel.sqlite');

let db: Database | null = null;

// Default configuration
let settings: SystemSettings = {
  safe_max: 39,
  warning_max: 69,
  offline_timeout_minutes: 5,
  auto_sms_danger: true,
  simulation_interval_sec: 4,
  hardware_api_key: 'ms_sec_esp32_mine_key_2026'
};

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing Mine Sentinel SQLite database from disk.');
    } catch (err) {
      console.error('Failed to load existing SQLite database, creating new one:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('Created new Mine Sentinel SQLite database.');
  }

  createTables(db);
  seedInitialData(db);
  saveDatabaseToDisk();

  return db;
}

export function saveDatabaseToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function createTables(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      device_name TEXT NOT NULL,
      installation_location TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      status TEXT DEFAULT 'ONLINE',
      created_at TEXT NOT NULL,
      last_seen TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      tilt_x REAL NOT NULL,
      tilt_y REAL NOT NULL,
      tilt_magnitude REAL NOT NULL,
      vibration REAL NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score REAL NOT NULL,
      sms_sent INTEGER DEFAULT 0,
      sms_sent_time TEXT,
      created_at TEXT NOT NULL,
      is_demo INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sms_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      message TEXT NOT NULL,
      sent INTEGER DEFAULT 1,
      sent_time TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS risk_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      risk_score REAL NOT NULL,
      risk_level TEXT NOT NULL,
      prediction_reason TEXT NOT NULL,
      model_version TEXT NOT NULL,
      tilt_trend TEXT NOT NULL,
      vibration_trend TEXT NOT NULL,
      tilt_rate REAL NOT NULL,
      vibration_rate REAL NOT NULL,
      rolling_tilt_avg REAL NOT NULL,
      rolling_vibration_avg REAL NOT NULL,
      historical_risk_avg REAL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_readings(device_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_sensor_time ON sensor_readings(timestamp);
  `);
}

function seedInitialData(database: Database) {
  // Check if devices exist
  const res = database.exec('SELECT COUNT(*) as cnt FROM devices');
  const count = res[0]?.values[0]?.[0] as number;

  if (count && count > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial Mine Sentinel sensor nodes and geological historical data...');
  database.run('BEGIN TRANSACTION;');

  // 1. Initial devices
  const initialDevices = [
    {
      device_id: 'NODE-001',
      device_name: 'Overburden Bench Node Alpha',
      installation_location: 'Shaft 4 South Overburden Slope (Panel A-12)',
      latitude: 10.7905,
      longitude: 78.7047,
      status: 'ONLINE',
      created_at: '2026-08-01T08:00:00Z',
      last_seen: '2026-09-02T22:00:05Z'
    },
    {
      device_id: 'NODE-002',
      device_name: 'Longwall Extraction Surface Monitor',
      installation_location: 'Longwall Panel B Surface Subsidence Center',
      latitude: 10.7942,
      longitude: 78.7089,
      status: 'ONLINE',
      created_at: '2026-08-01T08:00:00Z',
      last_seen: '2026-09-02T21:58:30Z'
    },
    {
      device_id: 'NODE-003',
      device_name: 'Haul Road Embankment Guard',
      installation_location: 'East Haulage Corridor Embankment KM 4.2',
      latitude: 10.7860,
      longitude: 78.7012,
      status: 'ONLINE',
      created_at: '2026-08-05T09:30:00Z',
      last_seen: '2026-09-02T21:55:00Z'
    },
    {
      device_id: 'NODE-004',
      device_name: 'Ventilation Fan Surface Pad',
      installation_location: 'Upcast Ventilation Shaft 2 Concrete Collar',
      latitude: 10.7980,
      longitude: 78.7030,
      status: 'ONLINE',
      created_at: '2026-08-10T11:00:00Z',
      last_seen: '2026-09-02T21:59:10Z'
    },
    {
      device_id: 'NODE-005',
      device_name: 'Tailings Dam Crest Inclinometer',
      installation_location: 'West Tailing Dam Crest Station 08',
      latitude: 10.7820,
      longitude: 78.7120,
      status: 'ONLINE',
      created_at: '2026-08-12T14:00:00Z',
      last_seen: '2026-09-02T21:57:45Z'
    }
  ];

  for (const d of initialDevices) {
    database.run(
      `INSERT INTO devices (device_id, device_name, installation_location, latitude, longitude, status, created_at, last_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.device_id, d.device_name, d.installation_location, d.latitude, d.longitude, d.status, d.created_at, d.last_seen]
    );
  }

  // 2. Users
  database.run(
    `INSERT INTO users (name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['Chief Geotechnical Engineer', 'geotech@minesentinel.internal', 'argon2$simulated$mine2026', 'ADMIN', '2026-08-01T00:00:00Z']
  );
  database.run(
    `INSERT INTO users (name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['Mine Safety Inspector', 'safety@minesentinel.internal', 'argon2$simulated$mine2026', 'SAFETY_OFFICER', '2026-08-01T00:00:00Z']
  );

  // 3. Historical sensor readings (August 20, 2026 - September 02, 2026)
  // Generating realistic strata movement & microseismic activity for all nodes
  const startDate = new Date('2026-08-20T00:00:00Z');
  const endDate = new Date('2026-09-02T22:00:00Z');

  // Insert periodic historical readings (every 4 hours between Aug 20 and Sep 1, then hourly on Sep 2)
  let curr = new Date(startDate);
  while (curr <= endDate) {
    const timeISO = curr.toISOString();
    const dateDay = curr.getDate();
    const isAug25 = curr.getMonth() === 7 && dateDay === 25;
    const isAug28 = curr.getMonth() === 7 && dateDay === 28;
    const isSep2 = curr.getMonth() === 8 && dateDay === 2;

    for (const dev of initialDevices) {
      let tilt_x = 0.2 + (Math.sin(curr.getTime() / 86400000) * 0.1);
      let tilt_y = 0.15 + (Math.cos(curr.getTime() / 86400000) * 0.1);
      let vibration = 0.4 + (Math.random() * 0.3);
      let riskScore = 15;
      let riskLevel = 'SAFE';

      if (dev.device_id === 'NODE-001') {
        // NODE-001 experiences increasing tilt trend towards Aug 25 and Sep 02
        const progress = (curr.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
        tilt_x = 0.4 + progress * 1.1 + (Math.random() * 0.15);
        tilt_y = 0.3 + progress * 0.8 + (Math.random() * 0.12);
        vibration = 1.1 + progress * 1.4 + (Math.random() * 0.4);

        if (isAug25) {
          tilt_x += 0.4;
          tilt_y += 0.3;
          vibration += 0.8;
        }

        const mag = Math.sqrt(tilt_x * tilt_x + tilt_y * tilt_y);
        riskScore = Math.min(95, Math.round(mag * 25 + vibration * 14));
        if (riskScore >= 70) riskLevel = 'DANGER';
        else if (riskScore >= 40) riskLevel = 'WARNING';
        else riskLevel = 'SAFE';
      } else if (dev.device_id === 'NODE-002') {
        // NODE-002: Longwall extraction with notable vibration peaks especially around Aug 28
        const progress = (curr.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
        tilt_x = 0.3 + (Math.sin(progress * 4) * 0.4) + 0.2;
        tilt_y = 0.25 + (Math.cos(progress * 4) * 0.3) + 0.2;
        vibration = isAug28 ? 3.4 + (Math.random() * 0.9) : 0.8 + progress * 0.8 + (Math.random() * 0.5);

        const mag = Math.sqrt(tilt_x * tilt_x + tilt_y * tilt_y);
        riskScore = Math.min(98, Math.round(mag * 18 + vibration * 20));
        if (riskScore >= 70) riskLevel = 'DANGER';
        else if (riskScore >= 40) riskLevel = 'WARNING';
        else riskLevel = 'SAFE';
      } else {
        // Stable nodes
        tilt_x += (Math.random() - 0.5) * 0.1;
        tilt_y += (Math.random() - 0.5) * 0.1;
        vibration += (Math.random() - 0.5) * 0.2;
        const mag = Math.sqrt(tilt_x * tilt_x + tilt_y * tilt_y);
        riskScore = Math.min(35, Math.max(8, Math.round(mag * 15 + vibration * 10)));
        riskLevel = 'SAFE';
      }

      const tilt_mag = parseFloat(Math.sqrt(tilt_x * tilt_x + tilt_y * tilt_y).toFixed(3));
      tilt_x = parseFloat(tilt_x.toFixed(3));
      tilt_y = parseFloat(tilt_y.toFixed(3));
      vibration = parseFloat(vibration.toFixed(3));

      let sms_sent = 0;
      let sms_sent_time = null;

      if (riskLevel === 'DANGER' || (riskLevel === 'WARNING' && Math.random() > 0.8)) {
        sms_sent = 1;
        sms_sent_time = timeISO;
      }

      database.run(
        `INSERT INTO sensor_readings
         (device_id, timestamp, latitude, longitude, tilt_x, tilt_y, tilt_magnitude, vibration, risk_level, risk_score, sms_sent, sms_sent_time, created_at, is_demo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [dev.device_id, timeISO, dev.latitude, dev.longitude, tilt_x, tilt_y, tilt_mag, vibration, riskLevel, riskScore, sms_sent, sms_sent_time, timeISO]
      );

      // Record SMS alert if sent
      if (sms_sent === 1) {
        database.run(
          `INSERT INTO sms_alerts (device_id, alert_type, message, sent, sent_time, created_at)
           VALUES (?, ?, ?, 1, ?, ?)`,
          [
            dev.device_id,
            riskLevel === 'DANGER' ? 'DANGER ALERT' : 'WARNING ALERT',
            `Mine Sentinel: ${dev.device_id} triggered ${riskLevel}. Tilt: ${tilt_mag}°, Vib: ${vibration}. Ground movement detected.`,
            timeISO,
            timeISO
          ]
        );
      }
    }

    // Step forward: hourly on Sep 1-2, 4-hourly earlier
    const stepHours = (curr.getMonth() === 8 && curr.getDate() >= 1) ? 1 : 4;
    curr = new Date(curr.getTime() + stepHours * 3600 * 1000);
  }

  // Ensure exact prompt example for NODE-001 is stored:
  // "device_id": "NODE-001", "timestamp": "2026-09-02T22:00:00", "latitude": 10.7905, "longitude": 78.7047, "tilt_x": 1.25, "tilt_y": 0.85, "vibration": 2.35
  const sampleMag = parseFloat(Math.sqrt(1.25 * 1.25 + 0.85 * 0.85).toFixed(3));
  database.run(
    `INSERT INTO sensor_readings
     (device_id, timestamp, latitude, longitude, tilt_x, tilt_y, tilt_magnitude, vibration, risk_level, risk_score, sms_sent, sms_sent_time, created_at, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    ['NODE-001', '2026-09-02T22:00:00', 10.7905, 78.7047, 1.25, 0.85, sampleMag, 2.35, 'WARNING', 58, 1, '2026-09-02T22:00:05', '2026-09-02T22:00:05']
  );

  database.run(
    `INSERT INTO sms_alerts (device_id, alert_type, message, sent, sent_time, created_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [
      'NODE-001',
      'WARNING ALERT',
      'Abnormal tilt detected on NODE-001. Tilt: 1.51°, Vibration: 2.35. SMS dispatched to field safety officer.',
      '2026-09-02T22:00:05',
      '2026-09-02T22:00:05'
    ]
  );

  // Store initial Risk Prediction
  database.run(
    `INSERT INTO risk_predictions
     (device_id, timestamp, risk_score, risk_level, prediction_reason, model_version, tilt_trend, vibration_trend, tilt_rate, vibration_rate, rolling_tilt_avg, rolling_vibration_avg, historical_risk_avg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'NODE-001',
      '2026-09-02T22:00:05',
      58,
      'WARNING',
      'Potential abnormal ground movement indicated by increasing tilt trend (+0.38°/hr) and vibration variation (> 2.0g).',
      'RandomForest-Strata-v2.4',
      'Increasing',
      'Increasing',
      0.38,
      0.45,
      1.32,
      2.10,
      48.5
    ]
  );

  database.run('COMMIT;');
  console.log('Seeding completed successfully.');
}

// Helper query wrappers
export function getDevices(): Device[] {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT d.*, 
      (SELECT risk_level FROM sensor_readings WHERE device_id = d.device_id ORDER BY timestamp DESC LIMIT 1) as current_risk_level,
      (SELECT risk_score FROM sensor_readings WHERE device_id = d.device_id ORDER BY timestamp DESC LIMIT 1) as current_risk_score,
      (SELECT tilt_magnitude FROM sensor_readings WHERE device_id = d.device_id ORDER BY timestamp DESC LIMIT 1) as current_tilt,
      (SELECT vibration FROM sensor_readings WHERE device_id = d.device_id ORDER BY timestamp DESC LIMIT 1) as current_vibration
    FROM devices d
    ORDER BY d.device_id ASC
  `);

  const results: Device[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    // Check if offline based on settings.offline_timeout_minutes
    const lastSeen = new Date(row.last_seen).getTime();
    const now = new Date('2026-09-02T22:05:00Z').getTime(); // Reference time context
    const diffMinutes = (now - lastSeen) / (60 * 1000);
    const isOnline = diffMinutes <= settings.offline_timeout_minutes;

    results.push({
      id: row.id,
      device_id: row.device_id,
      device_name: row.device_name,
      installation_location: row.installation_location,
      latitude: row.latitude,
      longitude: row.longitude,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      created_at: row.created_at,
      last_seen: row.last_seen,
      current_risk_level: row.current_risk_level || 'SAFE',
      current_risk_score: row.current_risk_score || 0,
      current_tilt: row.current_tilt || 0,
      current_vibration: row.current_vibration || 0
    });
  }
  stmt.free();
  return results;
}

export function getDevice(device_id: string): Device | null {
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT d.*,
      (SELECT risk_level FROM sensor_readings WHERE device_id = d.device_id ORDER BY timestamp DESC LIMIT 1) as current_risk_level,
      (SELECT risk_score FROM sensor_readings WHERE device_id = d.device_id ORDER BY timestamp DESC LIMIT 1) as current_risk_score,
      (SELECT tilt_magnitude FROM sensor_readings WHERE device_id = d.device_id ORDER BY timestamp DESC LIMIT 1) as current_tilt,
      (SELECT vibration FROM sensor_readings WHERE device_id = d.device_id ORDER BY timestamp DESC LIMIT 1) as current_vibration
    FROM devices d
    WHERE d.device_id = ?
  `);
  stmt.bind([device_id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    stmt.free();
    return {
      id: row.id,
      device_id: row.device_id,
      device_name: row.device_name,
      installation_location: row.installation_location,
      latitude: row.latitude,
      longitude: row.longitude,
      status: row.status as 'ONLINE' | 'OFFLINE',
      created_at: row.created_at,
      last_seen: row.last_seen,
      current_risk_level: row.current_risk_level || 'SAFE',
      current_risk_score: row.current_risk_score || 0,
      current_tilt: row.current_tilt || 0,
      current_vibration: row.current_vibration || 0
    };
  }
  stmt.free();
  return null;
}

export function upsertDevice(device: {
  device_id: string;
  device_name: string;
  installation_location: string;
  latitude: number;
  longitude: number;
  status?: 'ONLINE' | 'OFFLINE';
  last_seen?: string;
}) {
  if (!db) return;
  const existing = getDevice(device.device_id);
  const nowISO = device.last_seen || new Date().toISOString();
  if (existing) {
    db.run(
      `UPDATE devices 
       SET device_name = ?, installation_location = ?, latitude = ?, longitude = ?, status = ?, last_seen = ?
       WHERE device_id = ?`,
      [
        device.device_name || existing.device_name,
        device.installation_location || existing.installation_location,
        device.latitude !== undefined ? device.latitude : existing.latitude,
        device.longitude !== undefined ? device.longitude : existing.longitude,
        device.status || existing.status,
        nowISO,
        device.device_id
      ]
    );
  } else {
    db.run(
      `INSERT INTO devices (device_id, device_name, installation_location, latitude, longitude, status, created_at, last_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        device.device_id,
        device.device_name || `Sensor Node ${device.device_id}`,
        device.installation_location || 'Mine Subsidence Monitoring Grid',
        device.latitude,
        device.longitude,
        device.status || 'ONLINE',
        nowISO,
        nowISO
      ]
    );
  }
  saveDatabaseToDisk();
}

export function deleteDevice(device_id: string) {
  if (!db) return;
  db.run('DELETE FROM devices WHERE device_id = ?', [device_id]);
  db.run('DELETE FROM sensor_readings WHERE device_id = ?', [device_id]);
  db.run('DELETE FROM sms_alerts WHERE device_id = ?', [device_id]);
  db.run('DELETE FROM risk_predictions WHERE device_id = ?', [device_id]);
  saveDatabaseToDisk();
}

export function insertSensorReading(reading: {
  device_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  tilt_x: number;
  tilt_y: number;
  tilt_magnitude: number;
  vibration: number;
  risk_level: string;
  risk_score: number;
  sms_sent?: boolean;
  sms_sent_time?: string | null;
  is_demo?: boolean;
}) {
  if (!db) return 0;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO sensor_readings
     (device_id, timestamp, latitude, longitude, tilt_x, tilt_y, tilt_magnitude, vibration, risk_level, risk_score, sms_sent, sms_sent_time, created_at, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reading.device_id,
      reading.timestamp,
      reading.latitude,
      reading.longitude,
      reading.tilt_x,
      reading.tilt_y,
      reading.tilt_magnitude,
      reading.vibration,
      reading.risk_level,
      reading.risk_score,
      reading.sms_sent ? 1 : 0,
      reading.sms_sent_time || null,
      now,
      reading.is_demo ? 1 : 0
    ]
  );

  // Update device last_seen and coordinates
  db.run(
    `UPDATE devices SET last_seen = ?, latitude = ?, longitude = ?, status = 'ONLINE' WHERE device_id = ?`,
    [reading.timestamp, reading.latitude, reading.longitude, reading.device_id]
  );

  saveDatabaseToDisk();
}

export function getLatestSensorData(device_id?: string): SensorReading | null {
  if (!db) return null;
  const query = device_id
    ? `SELECT * FROM sensor_readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1`
    : `SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1`;
  const stmt = db.prepare(query);
  if (device_id) stmt.bind([device_id]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    stmt.free();
    return {
      ...row,
      sms_sent: Boolean(row.sms_sent),
      is_demo: Boolean(row.is_demo)
    };
  }
  stmt.free();
  return null;
}

export function getSensorHistory(device_id: string, limit = 50): SensorReading[] {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT * FROM sensor_readings 
    WHERE device_id = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `);
  stmt.bind([device_id, limit]);
  const list: SensorReading[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    list.push({
      ...row,
      sms_sent: Boolean(row.sms_sent),
      is_demo: Boolean(row.is_demo)
    });
  }
  stmt.free();
  return list.reverse(); // ascending chronological for graphs
}

export function getRecentReadingsAll(limit = 20): SensorReading[] {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT * FROM sensor_readings 
    ORDER BY timestamp DESC 
    LIMIT ?
  `);
  stmt.bind([limit]);
  const list: SensorReading[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    list.push({
      ...row,
      sms_sent: Boolean(row.sms_sent),
      is_demo: Boolean(row.is_demo)
    });
  }
  stmt.free();
  return list;
}

export function getSensorDataForDate(device_id: string, dateStr: string): SensorReading[] {
  if (!db) return [];
  // Supports '2026-08-25' or '25 August 2026' or '2026-08-25T...'
  // Normalize dateStr to YYYY-MM-DD
  const normalized = normalizeDateInput(dateStr);
  const stmt = db.prepare(`
    SELECT * FROM sensor_readings 
    WHERE device_id = ? AND timestamp LIKE ?
    ORDER BY timestamp ASC
  `);
  stmt.bind([device_id, `${normalized}%`]);
  const list: SensorReading[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    list.push({
      ...row,
      sms_sent: Boolean(row.sms_sent),
      is_demo: Boolean(row.is_demo)
    });
  }
  stmt.free();
  return list;
}

export function getSensorDataForDateRange(device_id: string, startDateStr: string, endDateStr: string): SensorReading[] {
  if (!db) return [];
  const start = normalizeDateInput(startDateStr);
  const end = normalizeDateInput(endDateStr);
  const stmt = db.prepare(`
    SELECT * FROM sensor_readings 
    WHERE device_id = ? AND timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
  `);
  stmt.bind([device_id, `${start}T00:00:00`, `${end}T23:59:59`]);
  const list: SensorReading[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    list.push({
      ...row,
      sms_sent: Boolean(row.sms_sent),
      is_demo: Boolean(row.is_demo)
    });
  }
  stmt.free();
  return list;
}

export function getAlertHistory(limit = 50): SmsAlert[] {
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT * FROM sms_alerts 
    ORDER BY sent_time DESC 
    LIMIT ?
  `);
  stmt.bind([limit]);
  const list: SmsAlert[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    list.push({
      ...row,
      sent: Boolean(row.sent)
    });
  }
  stmt.free();
  return list;
}

export function insertSmsAlert(alert: {
  device_id: string;
  alert_type: string;
  message: string;
  sent?: boolean;
  sent_time?: string;
}) {
  if (!db) return;
  const now = alert.sent_time || new Date().toISOString();
  db.run(
    `INSERT INTO sms_alerts (device_id, alert_type, message, sent, sent_time, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [alert.device_id, alert.alert_type, alert.message, alert.sent !== false ? 1 : 0, now, now]
  );
  saveDatabaseToDisk();
}

export function insertRiskPrediction(prediction: Omit<RiskPrediction, 'id'>) {
  if (!db) return;
  db.run(
    `INSERT INTO risk_predictions 
     (device_id, timestamp, risk_score, risk_level, prediction_reason, model_version, tilt_trend, vibration_trend, tilt_rate, vibration_rate, rolling_tilt_avg, rolling_vibration_avg, historical_risk_avg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      prediction.device_id,
      prediction.timestamp,
      prediction.risk_score,
      prediction.risk_level,
      prediction.prediction_reason,
      prediction.model_version,
      prediction.tilt_trend,
      prediction.vibration_trend,
      prediction.tilt_rate,
      prediction.vibration_rate,
      prediction.rolling_tilt_avg,
      prediction.rolling_vibration_avg,
      prediction.historical_risk_avg || 0
    ]
  );
  saveDatabaseToDisk();
}

export function getLatestRiskPrediction(device_id: string): RiskPrediction | null {
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT * FROM risk_predictions 
    WHERE device_id = ? 
    ORDER BY timestamp DESC 
    LIMIT 1
  `);
  stmt.bind([device_id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    stmt.free();
    return row as RiskPrediction;
  }
  stmt.free();
  return null;
}

export function getHighestVibration(): { device_id: string; vibration: number; timestamp: string } | null {
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT device_id, vibration, timestamp 
    FROM sensor_readings 
    ORDER BY vibration DESC 
    LIMIT 1
  `);
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function getHighestTilt(): { device_id: string; tilt_magnitude: number; timestamp: string } | null {
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT device_id, tilt_magnitude, timestamp 
    FROM sensor_readings 
    ORDER BY tilt_magnitude DESC 
    LIMIT 1
  `);
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function getSystemStats(): SystemStats {
  const devices = getDevices();
  let safe = 0;
  let warning = 0;
  let danger = 0;

  for (const d of devices) {
    if (d.current_risk_level === 'DANGER') danger++;
    else if (d.current_risk_level === 'WARNING') warning++;
    else safe++;
  }

  const latest = getLatestSensorData();

  let total_readings = 0;
  let total_alerts = 0;
  if (db) {
    const r1 = db.exec('SELECT COUNT(*) as c FROM sensor_readings');
    total_readings = (r1[0]?.values[0]?.[0] as number) || 0;

    const r2 = db.exec('SELECT COUNT(*) as c FROM sms_alerts');
    total_alerts = (r2[0]?.values[0]?.[0] as number) || 0;
  }

  return {
    active_devices: devices.filter(d => d.status === 'ONLINE').length,
    safe_devices: safe,
    warning_devices: warning,
    danger_devices: danger,
    last_data_received: latest ? latest.timestamp : null,
    total_readings,
    total_alerts
  };
}

export function getSettings(): SystemSettings {
  return { ...settings };
}

export function updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
  settings = { ...settings, ...newSettings };
  return { ...settings };
}

// Helper: parse flexible dates like "25 August 2026", "2026-08-25", "August 25"
export function normalizeDateInput(input: string): string {
  if (!input) return new Date().toISOString().split('T')[0];
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return trimmed;
}
