import React from 'react';
import {
  Activity,
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  Clock,
  MapPin,
  Cpu
} from 'lucide-react';
import { LiveTiltGraph } from './LiveTiltGraph.tsx';
import { LiveVibrationGraph } from './LiveVibrationGraph.tsx';
import type { Device, SensorReading, RiskPrediction } from '../types.ts';

interface LiveMonitoringViewProps {
  devices: Device[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  readings: SensorReading[];
  latestReading: SensorReading | null;
  prediction: RiskPrediction | null;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  readings,
  latestReading,
  prediction
}) => {
  const currentDev = devices.find(d => d.device_id === selectedDeviceId) || devices[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 uppercase flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Hardware Node Telemetry & Dynamic Slope Monitoring
          </h2>
          <p className="text-xs text-slate-400">
            Real-time streaming from MPU-6050 accelerometer inclinometer and SW-420 seismic geophone
          </p>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase text-slate-400">Monitoring Node:</span>
          <select
            value={selectedDeviceId}
            onChange={e => onSelectDevice(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-amber-400 font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            {devices.map(d => (
              <option key={d.device_id} value={d.device_id}>
                {d.device_id} — {d.device_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Node Status Banner */}
      {currentDev && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center font-mono font-bold text-amber-400">
              {currentDev.device_id.replace('NODE-', '')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-100">{currentDev.device_id}</span>
                <span className="text-xs text-slate-400">({currentDev.device_name})</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {currentDev.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 font-mono">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" /> {currentDev.installation_location}
                </span>
                <span>Coordinates: {currentDev.latitude.toFixed(4)}, {currentDev.longitude.toFixed(4)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Tilt Trend</span>
              <span className="font-bold flex items-center gap-1 text-slate-200">
                {prediction?.tilt_trend === 'Increasing' && <TrendingUp className="w-4 h-4 text-rose-400" />}
                {prediction?.tilt_trend === 'Decreasing' && <TrendingDown className="w-4 h-4 text-emerald-400" />}
                {prediction?.tilt_trend === 'Stable' && <Minus className="w-4 h-4 text-slate-400" />}
                {prediction?.tilt_trend || 'Stable'}
              </span>
            </div>

            <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Vibration Trend</span>
              <span className="font-bold flex items-center gap-1 text-slate-200">
                {prediction?.vibration_trend === 'Increasing' && <TrendingUp className="w-4 h-4 text-rose-400" />}
                {prediction?.vibration_trend === 'Decreasing' && <TrendingDown className="w-4 h-4 text-emerald-400" />}
                {prediction?.vibration_trend === 'Stable' && <Minus className="w-4 h-4 text-slate-400" />}
                {prediction?.vibration_trend || 'Stable'}
              </span>
            </div>

            <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Tilt Rate</span>
              <span className="font-bold text-amber-400">
                {prediction?.tilt_rate ? `+${prediction.tilt_rate}°/hr` : '+0.00°/hr'}
              </span>
            </div>

            <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">Risk Score</span>
              <span className="font-bold text-rose-400">
                {currentDev.current_risk_score ?? 35}/100
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Live Inclinometer Graphs */}
      <div className="grid grid-cols-1 gap-6">
        <LiveTiltGraph readings={readings} currentReading={latestReading} />
        <LiveVibrationGraph readings={readings} currentReading={latestReading} />
      </div>

      {/* Raw Sensor Vector Packet Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h3 className="font-mono text-sm font-semibold uppercase text-slate-100 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          Raw Geotechnical Telemetry Payload (Last Packet Received)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Tilt X Component</span>
            <span className="text-base font-bold text-sky-400 mt-1 block">
              {(latestReading?.tilt_x ?? 0).toFixed(3)}°
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Tilt Y Component</span>
            <span className="text-base font-bold text-purple-400 mt-1 block">
              {(latestReading?.tilt_y ?? 0).toFixed(3)}°
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Resultant Magnitude</span>
            <span className="text-base font-bold text-amber-400 mt-1 block">
              {(latestReading?.tilt_magnitude ?? 0).toFixed(3)}°
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Dynamic Vibration</span>
            <span className="text-base font-bold text-cyan-400 mt-1 block">
              {(latestReading?.vibration ?? 0).toFixed(3)}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">GPS Latitude</span>
            <span className="text-base font-bold text-slate-200 mt-1 block">
              {(latestReading?.latitude ?? currentDev?.latitude ?? 10.7905).toFixed(4)}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">GPS Longitude</span>
            <span className="text-base font-bold text-slate-200 mt-1 block">
              {(latestReading?.longitude ?? currentDev?.longitude ?? 78.7047).toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
