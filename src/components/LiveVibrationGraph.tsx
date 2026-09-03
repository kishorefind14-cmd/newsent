import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SensorReading } from '../types.ts';

interface LiveVibrationGraphProps {
  readings: SensorReading[];
  currentReading?: SensorReading | null;
}

export const LiveVibrationGraph: React.FC<LiveVibrationGraphProps> = ({ readings, currentReading }) => {
  const latest = currentReading || (readings.length > 0 ? readings[readings.length - 1] : null);

  // Compute stats
  let minVib = 0;
  let maxVib = 0;
  let avgVib = 0;

  if (readings.length > 0) {
    const vibs = readings.map(r => r.vibration);
    minVib = Math.min(...vibs);
    maxVib = Math.max(...vibs);
    avgVib = vibs.reduce((a, b) => a + b, 0) / vibs.length;
  } else if (latest) {
    minVib = latest.vibration;
    maxVib = latest.vibration;
    avgVib = latest.vibration;
  }

  // Format data for Recharts
  const chartData = readings.map(r => ({
    time: formatTime(r.timestamp),
    vibration: r.vibration
  }));

  // Trend detection
  let trendDirection: 'Increasing' | 'Decreasing' | 'Stable' = 'Stable';
  if (readings.length >= 3) {
    const last3 = readings.slice(-3).map(r => r.vibration);
    if (last3[2] > last3[1] && last3[1] > last3[0]) trendDirection = 'Increasing';
    else if (last3[2] < last3[1] && last3[1] < last3[0]) trendDirection = 'Decreasing';
  }

  return (
    <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
              <Activity className="w-5 h-5 text-[#F27D26]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-semibold tracking-wide text-[#E4E7EB] uppercase">
                Real-Time Vibration Telemetry
              </h3>
              <p className="text-xs text-[#8E9299]">Micro-seismic acceleration & strata shock wave detector</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-[#18191d] p-2.5 rounded border border-[#26282e] text-center">
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Current Amplitude</div>
            <div className="text-base font-mono font-bold text-[#E4E7EB]">
              {(latest?.vibration ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299]">Min Level</div>
            <div className="text-sm font-mono text-[#00D26A] font-semibold">
              {minVib.toFixed(2)}
            </div>
          </div>
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299]">Max Level</div>
            <div className="text-sm font-mono text-[#FF3B30] font-semibold">
              {maxVib.toFixed(2)}
            </div>
          </div>
          <div className="p-1">
            <div className="text-[10px] uppercase font-mono text-[#8E9299]">Avg Level</div>
            <div className="text-sm font-mono text-[#E4E7EB]">
              {avgVib.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Line Chart */}
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
              dataKey="vibration"
              name="Vibration (g)"
              stroke="#00D26A"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#00D26A', stroke: '#0a0a0b' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-[10px] text-[#8E9299] pt-2 border-t border-[#26282e] font-mono">
        <span>X-Axis: Time</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#00D26A] inline-block"></span> Dynamic Vibration Level</span>
        <span>Y-Axis: Acceleration (g)</span>
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
