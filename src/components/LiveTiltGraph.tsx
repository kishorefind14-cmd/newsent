import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Compass, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SensorReading } from '../types.ts';

interface LiveTiltGraphProps {
  readings: SensorReading[];
  currentReading?: SensorReading | null;
}

export const LiveTiltGraph: React.FC<LiveTiltGraphProps> = ({ readings, currentReading }) => {
  const latest = currentReading || (readings.length > 0 ? readings[readings.length - 1] : null);

  // Compute stats
  let minTilt = 0;
  let maxTilt = 0;
  let avgTilt = 0;

  if (readings.length > 0) {
    const magnitudes = readings.map(r => r.tilt_magnitude);
    minTilt = Math.min(...magnitudes);
    maxTilt = Math.max(...magnitudes);
    avgTilt = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  } else if (latest) {
    minTilt = latest.tilt_magnitude;
    maxTilt = latest.tilt_magnitude;
    avgTilt = latest.tilt_magnitude;
  }

  // Format data for Recharts
  const chartData = readings.map(r => ({
    time: formatTime(r.timestamp),
    tilt: r.tilt_magnitude,
    tilt_x: r.tilt_x,
    tilt_y: r.tilt_y
  }));

  // Trend detection
  let trendDirection: 'Increasing' | 'Decreasing' | 'Stable' = 'Stable';
  if (readings.length >= 3) {
    const last3 = readings.slice(-3).map(r => r.tilt_magnitude);
    if (last3[2] > last3[1] && last3[1] > last3[0]) trendDirection = 'Increasing';
    else if (last3[2] < last3[1] && last3[1] < last3[0]) trendDirection = 'Decreasing';
  }

  return (
    <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
              <Compass className="w-5 h-5 text-[#F27D26]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-semibold tracking-wide text-[#E4E7EB] uppercase">
                Real-Time Tilt Telemetry
              </h3>
              <p className="text-xs text-[#8E9299]">Dual-axis MEMS inclinometer vector tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded border bg-[#18191d] border-[#26282e] text-[#8E9299] flex items-center gap-1.5">
              {trendDirection === 'Increasing' && <TrendingUp className="w-3.5 h-3.5 text-[#FF3B30]" />}
              {trendDirection === 'Decreasing' && <TrendingDown className="w-3.5 h-3.5 text-[#00D26A]" />}
              {trendDirection === 'Stable' && <Minus className="w-3.5 h-3.5 text-[#8E9299]" />}
              Trend: <span className={trendDirection === 'Increasing' ? 'text-[#FF3B30] font-bold' : trendDirection === 'Decreasing' ? 'text-[#00D26A] font-bold' : 'text-[#E4E7EB]'}>{trendDirection}</span>
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-4 bg-[#18191d] p-2.5 rounded border border-[#26282e] text-center">
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Current</div>
            <div className="text-base font-mono font-bold text-[#F27D26]">
              {(latest?.tilt_magnitude ?? 0).toFixed(2)}°
            </div>
          </div>
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299]">Tilt X</div>
            <div className="text-sm font-mono font-medium text-[#E4E7EB]">
              {(latest?.tilt_x ?? 0).toFixed(2)}°
            </div>
          </div>
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299]">Tilt Y</div>
            <div className="text-sm font-mono font-medium text-[#E4E7EB]">
              {(latest?.tilt_y ?? 0).toFixed(2)}°
            </div>
          </div>
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299]">Magnitude</div>
            <div className="text-sm font-mono font-bold text-[#F27D26]">
              {(latest?.tilt_magnitude ?? 0).toFixed(2)}°
            </div>
          </div>
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299]">Min Tilt</div>
            <div className="text-sm font-mono text-[#00D26A] font-semibold">
              {minTilt.toFixed(2)}°
            </div>
          </div>
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299]">Max Tilt</div>
            <div className="text-sm font-mono text-[#FF3B30] font-semibold">
              {maxTilt.toFixed(2)}°
            </div>
          </div>
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299]">Avg Tilt</div>
            <div className="text-sm font-mono text-[#E4E7EB]">
              {avgTilt.toFixed(2)}°
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Live Line Chart */}
      <div className="h-56 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#26282e" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#8E9299"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#26282e' }}
            />
            <YAxis
              stroke="#8E9299"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#26282e' }}
              unit="°"
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#151619',
                borderColor: '#26282e',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#E4E7EB'
              }}
              labelStyle={{ color: '#8E9299' }}
            />
            <Line
              type="monotone"
              dataKey="tilt"
              name="Tilt Mag (°)"
              stroke="#F27D26"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#F27D26', stroke: '#0a0a0b' }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="tilt_x"
              name="Tilt X (°)"
              stroke="#00D26A"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="tilt_y"
              name="Tilt Y (°)"
              stroke="#A855F7"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-[10px] text-[#8E9299] pt-2 border-t border-[#26282e] font-mono">
        <span>X-Axis: Time</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#F27D26] inline-block"></span> Tilt Mag</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#00D26A] inline-block"></span> Tilt X</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#A855F7] inline-block"></span> Tilt Y</span>
        </div>
        <span>Y-Axis: Angle (°)</span>
      </div>
    </div>
  );
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
