import React from 'react';
import {
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { LiveTiltGraph } from './LiveTiltGraph.tsx';
import { LiveVibrationGraph } from './LiveVibrationGraph.tsx';
import { LeafletMap } from './LeafletMap.tsx';
import type { Device, SensorReading, SystemStats, SmsAlert, RiskPrediction } from '../types.ts';

interface DashboardViewProps {
  stats: SystemStats | null;
  devices: Device[];
  readings: SensorReading[];
  latestReading: SensorReading | null;
  latestPrediction: RiskPrediction | null;
  recentAlerts: SmsAlert[];
  recentReadings: SensorReading[];
  onNavigateTab: (tab: string) => void;
  onSelectDevice: (deviceId: string) => void;
  selectedDeviceId: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  devices,
  readings,
  latestReading,
  latestPrediction,
  recentAlerts,
  recentReadings,
  onNavigateTab,
  onSelectDevice,
  selectedDeviceId
}) => {
  const activeCount = stats?.active_devices ?? devices.filter(d => d.status === 'ONLINE').length;
  const safeCount = stats?.safe_devices ?? devices.filter(d => d.current_risk_level === 'SAFE').length;
  const warningCount = stats?.warning_devices ?? devices.filter(d => d.current_risk_level === 'WARNING').length;
  const dangerCount = stats?.danger_devices ?? devices.filter(d => d.current_risk_level === 'DANGER').length;

  const currentDev = devices.find(d => d.device_id === selectedDeviceId) || devices[0];

  return (
    <div className="space-y-6">
      {/* 1. TOP CARDS (Section 5) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Active Devices */}
        <div className="bg-[#121316] border border-[#26282e] rounded p-3.5 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider">Active Nodes</div>
            <div className="text-2xl font-mono font-bold text-[#E4E7EB] mt-1">{activeCount}</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online & Syncing
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
            <HardDrive className="w-5 h-5 text-[#F27D26]" />
          </div>
        </div>

        {/* Safe Devices */}
        <div className="bg-[#121316] border border-[#26282e] rounded p-3.5 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider">Safe Nodes</div>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{safeCount}</div>
            <div className="text-[10px] text-[#8E9299] font-mono mt-0.5">Normal Stability</div>
          </div>
          <div className="p-2.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Warning Devices */}
        <div className="bg-[#121316] border border-[#26282e] rounded p-3.5 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider">Warning Nodes</div>
            <div className="text-2xl font-mono font-bold text-[#F27D26] mt-1">{warningCount}</div>
            <div className="text-[10px] text-[#F27D26]/80 font-mono mt-0.5">Elevated Trend</div>
          </div>
          <div className="p-2.5 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Danger Devices */}
        <div className="bg-[#121316] border border-[#26282e] rounded p-3.5 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider">Danger Nodes</div>
            <div className="text-2xl font-mono font-bold text-[#FF3B30] mt-1">{dangerCount}</div>
            <div className="text-[10px] text-[#FF3B30]/80 font-mono mt-0.5">Subsidence Alert</div>
          </div>
          <div className="p-2.5 rounded bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        {/* Last Data Received */}
        <div className="col-span-2 lg:col-span-1 bg-[#121316] border border-[#26282e] rounded p-3.5 shadow-md flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider">Telemetry Packet</div>
            <div className="text-sm font-mono font-bold text-[#E4E7EB] mt-1 truncate">
              {stats?.last_data_received ? formatClockTime(stats.last_data_received) : '22:00:05 UTC'}
            </div>
            <div className="text-[10px] text-[#8E9299] font-mono mt-0.5 truncate">
              {stats?.last_data_received ? formatDateOnly(stats.last_data_received) : '02 Sep 2026'}
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#18191d] text-[#F27D26] border border-[#26282e]">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Device Selector bar */}
      <div className="bg-[#121316] border border-[#26282e] rounded p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono uppercase text-[#8E9299] font-bold tracking-wider">Channel Focus:</span>
          <select
            value={selectedDeviceId}
            onChange={e => onSelectDevice(e.target.value)}
            className="bg-[#18191d] border border-[#26282e] text-[#F27D26] font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:border-[#F27D26]"
          >
            {devices.map(d => (
              <option key={d.device_id} value={d.device_id}>
                {d.device_id} — {d.device_name} ({d.current_risk_level || 'SAFE'})
              </option>
            ))}
          </select>
        </div>

        {currentDev && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="text-[#8E9299]">
              Location: <span className="text-[#E4E7EB] font-medium">{currentDev.installation_location}</span>
            </span>
            <span className="text-[#8E9299]">
              GPS: <span className="text-[#E4E7EB]">{currentDev.latitude.toFixed(4)}, {currentDev.longitude.toFixed(4)}</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase border ${
                currentDev.current_risk_level === 'DANGER'
                  ? 'bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/40 animate-pulse'
                  : currentDev.current_risk_level === 'WARNING'
                  ? 'bg-[#F27D26]/15 text-[#F27D26] border-[#F27D26]/40'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {currentDev.current_risk_level || 'SAFE'}
            </span>
          </div>
        )}
      </div>

      {/* 2. MAIN AREA: LIVE MONITORING & GPS MAP (Section 7, 8, 9, 26) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Live Graphs */}
        <div className="lg:col-span-7 space-y-6">
          <LiveTiltGraph readings={readings} currentReading={latestReading} />
          <LiveVibrationGraph readings={readings} currentReading={latestReading} />
        </div>

        {/* Right 5 cols: Live GPS Location Map */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-3">
              <div>
                <h3 className="font-mono text-sm font-semibold tracking-wide text-[#E4E7EB] uppercase flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#F27D26]" />
                  Live GPS Hardware Map
                </h3>
                <p className="text-xs text-[#8E9299]">Distributed sensor node grid in underground coal basin</p>
              </div>
              <button
                onClick={() => onNavigateTab('map')}
                className="text-xs text-[#F27D26] hover:text-[#ff9142] font-mono flex items-center gap-1"
              >
                Expand <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 min-h-[360px]">
              <LeafletMap
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={onSelectDevice}
                height="360px"
              />
            </div>

            {/* Quick Map Legend */}
            <div className="pt-3 mt-3 border-t border-[#26282e] grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-[#18191d] p-1.5 rounded border border-[#26282e]">
                <span className="text-emerald-400 font-bold block">{safeCount} SAFE</span>
                <span className="text-[10px] text-[#8E9299]">&lt; 0.8° tilt</span>
              </div>
              <div className="bg-[#18191d] p-1.5 rounded border border-[#26282e]">
                <span className="text-[#F27D26] font-bold block">{warningCount} WARNING</span>
                <span className="text-[10px] text-[#8E9299]">0.8° - 2.0° tilt</span>
              </div>
              <div className="bg-[#18191d] p-1.5 rounded border border-[#26282e]">
                <span className="text-[#FF3B30] font-bold block">{dangerCount} DANGER</span>
                <span className="text-[10px] text-[#8E9299]">&gt; 2.0° or high vib</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM AREA: AI RISK PREDICTION, RECENT ALERTS, RECENT READINGS (Section 26) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bottom Left 5 cols: AI Risk Prediction Card (Section 16) */}
        <div className="lg:col-span-5 bg-[#121316] border border-[#26282e] rounded p-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
                  <BrainCircuit className="w-5 h-5 text-[#F27D26]" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-semibold tracking-wide text-[#E4E7EB] uppercase">
                    AI Subsidence Risk Prediction
                  </h3>
                  <p className="text-xs text-[#8E9299] font-mono">Model: {latestPrediction?.model_version || 'RandomForest-Strata-v2.4'}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('risk')}
                className="text-xs text-[#F27D26] hover:text-[#ff9142] font-mono flex items-center gap-1"
              >
                Deep Analysis <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Score and Status */}
            <div className="grid grid-cols-3 gap-3 mb-4 bg-[#18191d] p-3 rounded border border-[#26282e] text-center">
              <div>
                <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Risk Score</div>
                <div
                  className={`text-2xl font-mono font-bold ${
                    (latestPrediction?.risk_score ?? 0) >= 70
                      ? 'text-[#FF3B30]'
                      : (latestPrediction?.risk_score ?? 0) >= 40
                      ? 'text-[#F27D26]'
                      : 'text-[#00D26A]'
                  }`}
                >
                  {latestPrediction?.risk_score ?? 58}/100
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Risk Level</div>
                <div className="mt-1">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase border inline-block ${
                      (latestPrediction?.risk_level || 'WARNING') === 'DANGER'
                        ? 'bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/40'
                        : (latestPrediction?.risk_level || 'WARNING') === 'WARNING'
                        ? 'bg-[#F27D26]/15 text-[#F27D26] border-[#F27D26]/40'
                        : 'bg-[#00D26A]/15 text-[#00D26A] border-[#00D26A]/40'
                    }`}
                  >
                    {latestPrediction?.risk_level || 'WARNING'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Strata Trend</div>
                <div className="flex items-center justify-center gap-1 mt-1 text-xs font-mono font-semibold">
                  {latestPrediction?.tilt_trend === 'Increasing' ? (
                    <span className="text-[#FF3B30] flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> Increasing
                    </span>
                  ) : latestPrediction?.tilt_trend === 'Decreasing' ? (
                    <span className="text-[#00D26A] flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" /> Decreasing
                    </span>
                  ) : (
                    <span className="text-[#8E9299] flex items-center gap-1">
                      <Minus className="w-4 h-4" /> Stable
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Prediction Reasoning */}
            <div className="bg-[#18191d] p-3 rounded border border-[#26282e] mb-4">
              <div className="text-[10px] font-mono text-[#F27D26] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5" /> AI Prediction Assessment:
              </div>
              <p className="text-xs text-[#E4E7EB] leading-relaxed">
                {latestPrediction?.prediction_reason ||
                  'Potential abnormal ground movement indicated by increasing tilt trend and vibration variation.'}
              </p>
            </div>

            {/* Key feature gauges */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#E4E7EB]">
              <div className="bg-[#18191d] p-2 rounded border border-[#26282e] flex justify-between">
                <span className="text-[#8E9299]">Tilt Rate:</span>
                <span className="text-[#F27D26] font-bold">+{latestPrediction?.tilt_rate ?? 0.38}°/hr</span>
              </div>
              <div className="bg-[#18191d] p-2 rounded border border-[#26282e] flex justify-between">
                <span className="text-[#8E9299]">Vibration Trend:</span>
                <span className="text-[#E4E7EB] font-bold">{latestPrediction?.vibration_trend ?? 'Increasing'}</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#8E9299] font-mono mt-4 pt-3 border-t border-[#26282e]">
            * Estimated subsidence risk based on available sensor data. Calibrated for coal mine overburden geomechanics.
          </div>
        </div>

        {/* Bottom Right 7 cols: Recent Alerts & Recent Readings */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recent Alerts (Section 18, 26) */}
          <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md">
            <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-3">
              <h3 className="font-mono text-sm font-semibold tracking-wide text-[#E4E7EB] uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F27D26]" />
                Recent Automatic SMS & System Alerts
              </h3>
              <button
                onClick={() => onNavigateTab('alerts')}
                className="text-xs text-[#F27D26] hover:text-[#ff9142] font-mono flex items-center gap-1"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentAlerts.slice(0, 4).map(alert => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded bg-[#18191d] border border-[#26282e] flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-[#F27D26]">{alert.device_id}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          alert.alert_type.includes('DANGER')
                            ? 'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/40'
                            : 'bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/40'
                        }`}
                      >
                        {alert.alert_type}
                      </span>
                      {alert.sent && (
                        <span className="text-[10px] font-mono text-[#00D26A] bg-[#00D26A]/10 px-1.5 py-0.5 rounded border border-[#00D26A]/20">
                          SMS Sent
                        </span>
                      )}
                    </div>
                    <p className="text-[#E4E7EB] truncate">{alert.message}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#8E9299] shrink-0">
                    {formatClockTime(alert.sent_time)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sensor Readings Table (Section 26) */}
          <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md">
            <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-3">
              <h3 className="font-mono text-sm font-semibold tracking-wide text-[#E4E7EB] uppercase">
                Recent Sensor Readings Live Stream
              </h3>
              <span className="text-[10px] font-mono text-[#8E9299] tracking-wider uppercase">DB SINK: SQLITE / PERSISTENT</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#26282e] text-[#8E9299] text-[10px] uppercase">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Node</th>
                    <th className="pb-2">Tilt (X, Y)</th>
                    <th className="pb-2">Magnitude</th>
                    <th className="pb-2">Vibration</th>
                    <th className="pb-2">Risk</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26282e]">
                  {recentReadings.slice(0, 5).map(r => (
                    <tr key={r.id} className="hover:bg-[#18191d] transition-colors">
                      <td className="py-2 text-[#8E9299]">{formatClockTime(r.timestamp)}</td>
                      <td className="py-2 font-bold text-[#F27D26]">{r.device_id}</td>
                      <td className="py-2 text-[#E4E7EB]">
                        {r.tilt_x.toFixed(2)}°, {r.tilt_y.toFixed(2)}°
                      </td>
                      <td className="py-2 font-semibold text-[#E4E7EB]">{r.tilt_magnitude.toFixed(2)}°</td>
                      <td className="py-2 text-[#E4E7EB]">{r.vibration.toFixed(2)}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.risk_level === 'DANGER'
                              ? 'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30'
                              : r.risk_level === 'WARNING'
                              ? 'bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/30'
                              : 'bg-[#00D26A]/15 text-[#00D26A] border border-[#00D26A]/30'
                          }`}
                        >
                          {r.risk_level}
                        </span>
                      </td>
                      <td className="py-2">
                        {r.is_demo ? (
                          <span className="text-[10px] text-[#F27D26]">DEMO</span>
                        ) : (
                          <span className="text-[10px] text-[#00D26A]">PROD</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatClockTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDateOnly(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
