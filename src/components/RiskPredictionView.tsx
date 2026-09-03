import React from 'react';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Cpu,
  Layers,
  Info,
  Compass,
  Activity,
  GitBranch,
  Gauge
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { Device, RiskPrediction, SensorReading } from '../types.ts';

interface RiskPredictionViewProps {
  devices: Device[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  prediction: RiskPrediction | null;
  readings: SensorReading[];
}

export const RiskPredictionView: React.FC<RiskPredictionViewProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  prediction,
  readings
}) => {
  const currentDev = devices.find(d => d.device_id === selectedDeviceId) || devices[0];
  const score = prediction?.risk_score ?? currentDev?.current_risk_score ?? 35;
  const level = prediction?.risk_level ?? currentDev?.current_risk_level ?? 'SAFE';
  const tiltTrend = prediction?.tilt_trend ?? 'Stable';
  const vibTrend = prediction?.vibration_trend ?? 'Stable';

  // Format historical risk timeline
  const riskTimelineData = readings.map(r => ({
    time: formatTimeOnly(r.timestamp),
    risk: r.risk_score || 0,
    tilt: r.tilt_magnitude,
    vibration: r.vibration
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#E4E7EB] uppercase flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-[#F27D26]" />
            AI/ML Mine Subsidence Risk Prediction Engine
          </h2>
          <p className="text-xs text-[#8E9299]">
            Real-time geomechanical classification, time-series anomaly detection, and early subsidence warning
          </p>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase text-[#8E9299] font-bold tracking-wider">Target Node:</span>
          <select
            value={selectedDeviceId}
            onChange={e => onSelectDevice(e.target.value)}
            className="bg-[#18191d] border border-[#26282e] text-[#F27D26] font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:border-[#F27D26]"
          >
            {devices.map(d => (
              <option key={d.device_id} value={d.device_id}>
                {d.device_id} — {d.device_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Risk Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Primary Risk Gauge Card (Section 14, 16) */}
        <div className="lg:col-span-5 bg-[#121316] border border-[#26282e] rounded p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-4">
              <span className="text-xs font-mono uppercase text-[#8E9299] font-semibold">
                Current Subsidence Risk Assessment
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18191d] text-[#8E9299] border border-[#26282e]">
                {prediction?.model_version || 'RandomForest-Strata-v2.4'}
              </span>
            </div>

            {/* Visual Risk Gauge */}
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-44 h-44 rounded-full border-8 flex flex-col items-center justify-center shadow-xl transition-all ${
                    level === 'DANGER'
                      ? 'border-[#FF3B30] bg-[#FF3B30]/10 shadow-[#FF3B30]/20 animate-pulse'
                      : level === 'WARNING'
                      ? 'border-[#F27D26] bg-[#F27D26]/10 shadow-[#F27D26]/20'
                      : 'border-[#00D26A] bg-[#00D26A]/10 shadow-[#00D26A]/20'
                  }`}
                >
                  <span className="text-4xl font-mono font-bold text-[#E4E7EB]">{score}</span>
                  <span className="text-[11px] font-mono uppercase text-[#8E9299]">Risk Index (0-100)</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-5">
                <span
                  className={`px-4 py-1.5 rounded text-xs font-mono font-bold tracking-widest uppercase border inline-flex items-center gap-2 ${
                    level === 'DANGER'
                      ? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/50'
                      : level === 'WARNING'
                      ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/50'
                      : 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/50'
                  }`}
                >
                  {level === 'DANGER' && <AlertOctagon className="w-4 h-4" />}
                  {level === 'WARNING' && <AlertTriangle className="w-4 h-4" />}
                  {level === 'SAFE' && <ShieldCheck className="w-4 h-4" />}
                  CLASSIFICATION: {level}
                </span>
              </div>
            </div>

            {/* Threshold legend */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-4 border-t border-[#26282e]">
              <div className="bg-[#18191d] p-2 rounded border border-[#26282e]">
                <span className="text-[#00D26A] font-bold block">0 - 39</span>
                <span className="text-[10px] text-[#8E9299] uppercase">SAFE</span>
              </div>
              <div className="bg-[#18191d] p-2 rounded border border-[#26282e]">
                <span className="text-[#F27D26] font-bold block">40 - 69</span>
                <span className="text-[10px] text-[#8E9299] uppercase">WARNING</span>
              </div>
              <div className="bg-[#18191d] p-2 rounded border border-[#26282e]">
                <span className="text-[#FF3B30] font-bold block">70 - 100</span>
                <span className="text-[10px] text-[#8E9299] uppercase">DANGER</span>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded bg-[#18191d] border border-[#26282e] text-[11px] text-[#8E9299] font-mono">
            * Estimated subsidence risk based on available sensor data. Calibrated for coal mine overburden geomechanics.
          </div>
        </div>

        {/* Right 7 Cols: Detailed Reason & Feature Breakdown (Section 15, 17) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Explanation Card */}
          <div className="bg-[#121316] border border-[#26282e] rounded p-5 shadow-md">
            <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB] mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#F27D26]" />
              AI Geomechanical Prediction Reasoning
            </h3>
            <div className="p-4 rounded bg-[#18191d] border border-[#26282e] text-xs text-[#E4E7EB] leading-relaxed space-y-2">
              <p>
                {prediction?.prediction_reason ||
                  'The model monitors progressive strata deformation using multi-frequency inclinometer telemetry. Surface tension fractures occur when tilt acceleration exceeds baseline threshold.'}
              </p>
              {level === 'DANGER' && (
                <div className="p-2.5 rounded bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] font-mono text-[11px] flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  Protocol: Automatic GSM emergency SMS alert dispatched to Mine Safety Superintendent. Immediate evacuation of affected longwall panel surface zone advised.
                </div>
              )}
            </div>
          </div>

          {/* Time Series Trend & Derivatives (Section 15) */}
          <div className="bg-[#121316] border border-[#26282e] rounded p-5 shadow-md">
            <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB] mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00D26A]" />
              Strata Dynamic Derivatives & Trends
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#18191d] p-3 rounded border border-[#26282e]">
                <div className="text-[10px] text-[#8E9299] uppercase">Tilt Trend</div>
                <div className="text-sm font-bold flex items-center gap-1 mt-1">
                  {tiltTrend === 'Increasing' && <TrendingUp className="w-4 h-4 text-[#FF3B30]" />}
                  {tiltTrend === 'Decreasing' && <TrendingDown className="w-4 h-4 text-[#00D26A]" />}
                  {tiltTrend === 'Stable' && <Minus className="w-4 h-4 text-[#8E9299]" />}
                  <span className={tiltTrend === 'Increasing' ? 'text-[#FF3B30]' : tiltTrend === 'Decreasing' ? 'text-[#00D26A]' : 'text-[#E4E7EB]'}>
                    {tiltTrend}
                  </span>
                </div>
              </div>

              <div className="bg-[#18191d] p-3 rounded border border-[#26282e]">
                <div className="text-[10px] text-[#8E9299] uppercase">Vibration Trend</div>
                <div className="text-sm font-bold flex items-center gap-1 mt-1">
                  {vibTrend === 'Increasing' && <TrendingUp className="w-4 h-4 text-[#FF3B30]" />}
                  {vibTrend === 'Decreasing' && <TrendingDown className="w-4 h-4 text-[#00D26A]" />}
                  {vibTrend === 'Stable' && <Minus className="w-4 h-4 text-[#8E9299]" />}
                  <span className={vibTrend === 'Increasing' ? 'text-[#FF3B30]' : vibTrend === 'Decreasing' ? 'text-[#00D26A]' : 'text-[#E4E7EB]'}>
                    {vibTrend}
                  </span>
                </div>
              </div>

              <div className="bg-[#18191d] p-3 rounded border border-[#26282e]">
                <div className="text-[10px] text-[#8E9299] uppercase">Tilt Rate</div>
                <div className="text-sm font-bold text-[#F27D26] mt-1">
                  {prediction?.tilt_rate ? `+${prediction.tilt_rate}°/hr` : '+0.00°/hr'}
                </div>
              </div>

              <div className="bg-[#18191d] p-3 rounded border border-[#26282e]">
                <div className="text-[10px] text-[#8E9299] uppercase">Rolling Tilt Avg</div>
                <div className="text-sm font-bold text-[#E4E7EB] mt-1">
                  {prediction?.rolling_tilt_avg ? `${prediction.rolling_tilt_avg}°` : '0.45°'}
                </div>
              </div>
            </div>
          </div>

          {/* Model Features Extractor Table */}
          <div className="bg-[#121316] border border-[#26282e] rounded p-5 shadow-md">
            <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB] mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#A855F7]" />
              Feature Weights & Geomechanical Inputs
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#26282e] text-[#8E9299] text-[10px] uppercase font-bold tracking-wider">
                    <th className="pb-2">Feature Name</th>
                    <th className="pb-2">Extracted Value</th>
                    <th className="pb-2">Safety Threshold</th>
                    <th className="pb-2">Model Importance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26282e] text-[#E4E7EB]">
                  <tr>
                    <td className="py-2">Tilt Magnitude (θ)</td>
                    <td className="py-2 text-[#F27D26] font-bold">{currentDev?.current_tilt?.toFixed(2) ?? 0.85}°</td>
                    <td className="py-2 text-[#8E9299]">&lt; 0.80° normal</td>
                    <td className="py-2 text-[#00D26A]">High (35%)</td>
                  </tr>
                  <tr>
                    <td className="py-2">Dynamic Vibration Velocity</td>
                    <td className="py-2 text-[#00D26A] font-bold">{currentDev?.current_vibration?.toFixed(2) ?? 1.2}</td>
                    <td className="py-2 text-[#8E9299]">&lt; 1.00 normal</td>
                    <td className="py-2 text-[#00D26A]">Medium (25%)</td>
                  </tr>
                  <tr>
                    <td className="py-2">Rate of Tilt Incline (dθ/dt)</td>
                    <td className="py-2 text-[#F27D26] font-semibold">+{prediction?.tilt_rate ?? 0.38}°/hr</td>
                    <td className="py-2 text-[#8E9299]">&lt; 0.15°/hr</td>
                    <td className="py-2 text-[#00D26A]">High (20%)</td>
                  </tr>
                  <tr>
                    <td className="py-2">Multi-Epoch Trend Vector</td>
                    <td className="py-2 text-[#E4E7EB]">{tiltTrend} / {vibTrend}</td>
                    <td className="py-2 text-[#8E9299]">Stable</td>
                    <td className="py-2 text-[#00D26A]">Medium (10%)</td>
                  </tr>
                  <tr>
                    <td className="py-2">Rolling Baseline Deviation</td>
                    <td className="py-2 text-[#E4E7EB]">{prediction?.rolling_tilt_avg ?? 0.65}°</td>
                    <td className="py-2 text-[#8E9299]">Historic baseline</td>
                    <td className="py-2 text-[#00D26A]">Low (10%)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Risk Timeline Chart */}
      <div className="bg-[#121316] border border-[#26282e] rounded p-5 shadow-md">
        <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-4">
          <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB] flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#FF3B30]" />
            Historical Risk Progression for {selectedDeviceId}
          </h3>
          <span className="text-xs font-mono text-[#8E9299]">{riskTimelineData.length} Telemetry Points</span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={riskTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradPage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#FF3B30" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#26282e" />
              <XAxis dataKey="time" stroke="#8E9299" fontSize={10} tickLine={false} />
              <YAxis stroke="#8E9299" fontSize={10} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#151619',
                  borderColor: '#26282e',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  color: '#E4E7EB'
                }}
              />
              <Area type="monotone" dataKey="risk" name="Risk Score (0-100)" stroke="#FF3B30" strokeWidth={2} fillOpacity={1} fill="url(#riskGradPage)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

function formatTimeOnly(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
