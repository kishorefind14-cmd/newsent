export type RiskLevel = 'SAFE' | 'WARNING' | 'DANGER';

export type TrendDirection = 'Increasing' | 'Stable' | 'Decreasing';

export interface Device {
  id: number;
  device_id: string;
  device_name: string;
  installation_location: string;
  latitude: number;
  longitude: number;
  status: 'ONLINE' | 'OFFLINE';
  created_at: string;
  last_seen: string;
  current_risk_level?: RiskLevel;
  current_risk_score?: number;
  current_tilt?: number;
  current_vibration?: number;
}

export interface SensorReading {
  id: number;
  device_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  tilt_x: number;
  tilt_y: number;
  tilt_magnitude: number;
  vibration: number;
  risk_level: RiskLevel;
  risk_score: number;
  sms_sent?: boolean;
  sms_sent_time?: string | null;
  created_at: string;
  is_demo?: boolean;
}

export interface SmsAlert {
  id: number;
  device_id: string;
  alert_type: string;
  message: string;
  sent: boolean;
  sent_time: string;
  created_at: string;
}

export interface RiskPrediction {
  id: number;
  device_id: string;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  prediction_reason: string;
  model_version: string;
  tilt_trend: TrendDirection;
  vibration_trend: TrendDirection;
  tilt_rate: number;
  vibration_rate: number;
  rolling_tilt_avg: number;
  rolling_vibration_avg: number;
  historical_risk_avg?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'GEOTECH_ENGINEER' | 'SAFETY_OFFICER' | 'OPERATOR';
  created_at: string;
}

export interface SystemStats {
  active_devices: number;
  safe_devices: number;
  warning_devices: number;
  danger_devices: number;
  last_data_received: string | null;
  total_readings: number;
  total_alerts: number;
}

export interface SystemSettings {
  safe_max: number;
  warning_max: number;
  offline_timeout_minutes: number;
  auto_sms_danger: boolean;
  simulation_interval_sec: number;
  hardware_api_key: string;
}

export interface ChatGraphData {
  type: 'tilt' | 'vibration' | 'risk' | 'combined';
  device_id: string;
  date?: string;
  title: string;
  data: Array<{
    time: string;
    timestamp: string;
    tilt?: number;
    tilt_x?: number;
    tilt_y?: number;
    vibration?: number;
    risk_score?: number;
  }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'bot';
  text: string;
  timestamp: string;
  graph?: ChatGraphData;
  toolsUsed?: string[];
}
