import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Activity,
  Compass,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import type { Device, SensorReading } from '../types.ts';

interface HistoricalAnalysisViewProps {
  devices: Device[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
}

export const HistoricalAnalysisView: React.FC<HistoricalAnalysisViewProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-25');
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState<string>('2026-08-20');
  const [endDate, setEndDate] = useState<string>('2026-09-02');
  const [sensorType, setSensorType] = useState<'all' | 'tilt' | 'vibration' | 'risk'>('all');

  const [loading, setLoading] = useState<boolean>(false);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [stats, setStats] = useState<{
    max_tilt: number;
    max_vibration: number;
    warning_count: number;
    danger_count: number;
    sms_alerts_count: number;
  }>({
    max_tilt: 0,
    max_vibration: 0,
    warning_count: 0,
    danger_count: 0,
    sms_alerts_count: 0
  });

  // Fetch actual data from database
  const fetchData = async () => {
    setLoading(true);
    try {
      if (mode === 'single') {
        const res = await fetch(`/api/sensor-data/date?device_id=${selectedDeviceId}&date=${selectedDate}`);
        const data = await res.json();
        const list: SensorReading[] = data.readings || [];
        setReadings(list);

        // Compute stats from actual readings
        let maxTilt = 0;
        let maxVib = 0;
        let warn = 0;
        let dang = 0;
        let sms = 0;

        for (const r of list) {
          if (r.tilt_magnitude > maxTilt) maxTilt = r.tilt_magnitude;
          if (r.vibration > maxVib) maxVib = r.vibration;
          if (r.risk_level === 'WARNING') warn++;
          if (r.risk_level === 'DANGER') dang++;
          if (r.sms_sent) sms++;
        }

        setStats({
          max_tilt: maxTilt,
          max_vibration: maxVib,
          warning_count: warn,
          danger_count: dang,
          sms_alerts_count: sms
        });
      } else {
        const res = await fetch(
          `/api/sensor-data/range?device_id=${selectedDeviceId}&start_date=${startDate}&end_date=${endDate}`
        );
        const data = await res.json();
        setReadings(data.readings || []);
        if (data.statistics) {
          setStats(data.statistics);
        }
      }
    } catch (err) {
      console.error('Failed to fetch historical database readings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDeviceId, selectedDate, mode, startDate, endDate]);

  // Fast preset date button click
  const setQuickDate = (d: string) => {
    setMode('single');
    setSelectedDate(d);
  };

  // Quick range button
  const setQuickRange = (rangeType: 'today' | 'yesterday' | '7days' | '30days') => {
    setMode('range');
    if (rangeType === 'today') {
      setStartDate('2026-09-02');
      setEndDate('2026-09-02');
    } else if (rangeType === 'yesterday') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-01');
    } else if (rangeType === '7days') {
      setStartDate('2026-08-26');
      setEndDate('2026-09-02');
    } else {
      setStartDate('2026-08-03');
      setEndDate('2026-09-02');
    }
  };

  // Export actual CSV
  const exportCSV = () => {
    if (readings.length === 0) {
      alert('No data available to export.');
      return;
    }
    const headers = [
      'Timestamp',
      'Device_ID',
      'Latitude',
      'Longitude',
      'Tilt_X',
      'Tilt_Y',
      'Tilt_Magnitude',
      'Vibration',
      'Risk_Level',
      'Risk_Score',
      'SMS_Sent'
    ];
    const rows = readings.map(r => [
      r.timestamp,
      r.device_id,
      r.latitude,
      r.longitude,
      r.tilt_x,
      r.tilt_y,
      r.tilt_magnitude,
      r.vibration,
      r.risk_level,
      r.risk_score,
      r.sms_sent ? 'YES' : 'NO'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mine_sentinel_${selectedDeviceId}_${mode === 'single' ? selectedDate : `${startDate}_to_${endDate}`}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = readings.map(r => ({
    time: formatTimeOnly(r.timestamp),
    date: r.timestamp.substring(0, 10),
    tilt_mag: r.tilt_magnitude,
    tilt_x: r.tilt_x,
    tilt_y: r.tilt_y,
    vibration: r.vibration,
    risk_score: r.risk_score || 0
  }));

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#E4E7EB] uppercase flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#F27D26]" />
            Historical Subsidence Analysis & Date-Specific Graphs
          </h2>
          <p className="text-xs text-[#8E9299]">
            Query permanent SQLite database records for single calendar dates or custom geological intervals.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={readings.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#F27D26] hover:bg-[#ff9142] disabled:opacity-50 text-[#0a0a0b] text-xs font-mono font-bold shadow-md transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Database CSV ({readings.length} Records)
        </button>
      </div>

      {/* Query Controls Card */}
      <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Device Selector */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider mb-1.5">
              Select Device Node:
            </label>
            <select
              value={selectedDeviceId}
              onChange={e => onSelectDevice(e.target.value)}
              className="w-full bg-[#18191d] border border-[#26282e] text-[#F27D26] font-mono text-xs rounded px-3 py-2 focus:outline-none focus:border-[#F27D26]"
            >
              {devices.map(d => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_id} — {d.device_name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode toggle */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider mb-1.5">
              Analysis Mode:
            </label>
            <div className="flex rounded border border-[#26282e] bg-[#18191d] p-0.5">
              <button
                onClick={() => setMode('single')}
                className={`flex-1 py-1.5 text-xs font-mono rounded transition-colors ${
                  mode === 'single' ? 'bg-[#F27D26] text-[#0a0a0b] font-bold' : 'text-[#8E9299] hover:text-[#E4E7EB]'
                }`}
              >
                Single Date
              </button>
              <button
                onClick={() => setMode('range')}
                className={`flex-1 py-1.5 text-xs font-mono rounded transition-colors ${
                  mode === 'range' ? 'bg-[#F27D26] text-[#0a0a0b] font-bold' : 'text-[#8E9299] hover:text-[#E4E7EB]'
                }`}
              >
                Date Range
              </button>
            </div>
          </div>

          {/* Date Selector */}
          {mode === 'single' ? (
            <div className="md:col-span-2">
              <label className="block text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider mb-1.5">
                Select Calendar Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] font-mono text-xs rounded px-3 py-2 focus:outline-none focus:border-[#F27D26]"
              />
            </div>
          ) : (
            <div className="md:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider mb-1.5">
                  Start Date:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] font-mono text-xs rounded px-3 py-2 focus:outline-none focus:border-[#F27D26]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#8E9299] font-bold tracking-wider mb-1.5">
                  End Date:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] font-mono text-xs rounded px-3 py-2 focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick presets (Section 11, 13) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#26282e]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase font-bold tracking-wider">Quick Date Presets:</span>
            <button
              onClick={() => setQuickDate('2026-08-25')}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                mode === 'single' && selectedDate === '2026-08-25'
                  ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/50'
                  : 'bg-[#18191d] text-[#8E9299] border-[#26282e] hover:border-[#353840] hover:text-[#E4E7EB]'
              }`}
            >
              25 August 2026
            </button>
            <button
              onClick={() => setQuickDate('2026-08-28')}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                mode === 'single' && selectedDate === '2026-08-28'
                  ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/50'
                  : 'bg-[#18191d] text-[#8E9299] border-[#26282e] hover:border-[#353840] hover:text-[#E4E7EB]'
              }`}
            >
              28 August 2026
            </button>
            <button
              onClick={() => setQuickDate('2026-09-01')}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                mode === 'single' && selectedDate === '2026-09-01'
                  ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/50'
                  : 'bg-[#18191d] text-[#8E9299] border-[#26282e] hover:border-[#353840] hover:text-[#E4E7EB]'
              }`}
            >
              1 September 2026
            </button>
            <button
              onClick={() => setQuickDate('2026-09-02')}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                mode === 'single' && selectedDate === '2026-09-02'
                  ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/50'
                  : 'bg-[#18191d] text-[#8E9299] border-[#26282e] hover:border-[#353840] hover:text-[#E4E7EB]'
              }`}
            >
              2 September 2026
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-[#8E9299] uppercase font-bold tracking-wider">Range:</span>
            <button
              onClick={() => setQuickRange('today')}
              className="px-2 py-1 rounded text-xs font-mono bg-[#18191d] text-[#8E9299] border border-[#26282e] hover:text-[#E4E7EB]"
            >
              Today
            </button>
            <button
              onClick={() => setQuickRange('yesterday')}
              className="px-2 py-1 rounded text-xs font-mono bg-[#18191d] text-[#8E9299] border border-[#26282e] hover:text-[#E4E7EB]"
            >
              Yesterday
            </button>
            <button
              onClick={() => setQuickRange('7days')}
              className="px-2 py-1 rounded text-xs font-mono bg-[#18191d] text-[#8E9299] border border-[#26282e] hover:text-[#E4E7EB]"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setQuickRange('30days')}
              className="px-2 py-1 rounded text-xs font-mono bg-[#18191d] text-[#8E9299] border border-[#26282e] hover:text-[#E4E7EB]"
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Summary Statistics Cards (Section 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#121316] border border-[#26282e] rounded p-3 shadow-md text-center">
          <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Maximum Tilt</div>
          <div className="text-xl font-mono font-bold text-[#F27D26] mt-1">{stats.max_tilt.toFixed(2)}°</div>
          <div className="text-[10px] text-[#8E9299] font-mono">Degrees Inclination</div>
        </div>
        <div className="bg-[#121316] border border-[#26282e] rounded p-3 shadow-md text-center">
          <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Maximum Vibration</div>
          <div className="text-xl font-mono font-bold text-[#00D26A] mt-1">{stats.max_vibration.toFixed(2)}</div>
          <div className="text-[10px] text-[#8E9299] font-mono">Dynamic Velocity Index</div>
        </div>
        <div className="bg-[#121316] border border-[#26282e] rounded p-3 shadow-md text-center">
          <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Warning Events</div>
          <div className="text-xl font-mono font-bold text-[#F27D26] mt-1">{stats.warning_count}</div>
          <div className="text-[10px] text-[#8E9299] font-mono">Threshold (40-69)</div>
        </div>
        <div className="bg-[#121316] border border-[#26282e] rounded p-3 shadow-md text-center">
          <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Danger Events</div>
          <div className="text-xl font-mono font-bold text-[#FF3B30] mt-1">{stats.danger_count}</div>
          <div className="text-[10px] text-[#8E9299] font-mono">Threshold (70-100)</div>
        </div>
        <div className="bg-[#121316] border border-[#26282e] rounded p-3 shadow-md text-center">
          <div className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">SMS Alerts Sent</div>
          <div className="text-xl font-mono font-bold text-[#A855F7] mt-1">{stats.sms_alerts_count}</div>
          <div className="text-[10px] text-[#8E9299] font-mono">GSM Outbound Triggers</div>
        </div>
      </div>

      {/* Sensor toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-[#8E9299] uppercase font-bold tracking-wider">View Graphs:</span>
        <button
          onClick={() => setSensorType('all')}
          className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
            sensorType === 'all'
              ? 'bg-[#F27D26] text-[#0a0a0b] font-bold border-[#F27D26]'
              : 'bg-[#121316] text-[#8E9299] border-[#26282e] hover:text-[#E4E7EB]'
          }`}
        >
          All Metrics
        </button>
        <button
          onClick={() => setSensorType('tilt')}
          className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
            sensorType === 'tilt'
              ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]'
              : 'bg-[#121316] text-[#8E9299] border-[#26282e] hover:text-[#E4E7EB]'
          }`}
        >
          Tilt Angle (X, Y, Mag)
        </button>
        <button
          onClick={() => setSensorType('vibration')}
          className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
            sensorType === 'vibration'
              ? 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]'
              : 'bg-[#121316] text-[#8E9299] border-[#26282e] hover:text-[#E4E7EB]'
          }`}
        >
          Dynamic Vibration
        </button>
        <button
          onClick={() => setSensorType('risk')}
          className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
            sensorType === 'risk'
              ? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]'
              : 'bg-[#121316] text-[#8E9299] border-[#26282e] hover:text-[#E4E7EB]'
          }`}
        >
          AI Subsidence Risk Score
        </button>
      </div>

      {/* Graphs Display */}
      {readings.length === 0 ? (
        <div className="bg-[#121316] border border-[#26282e] rounded p-12 text-center shadow-md">
          <div className="w-12 h-12 mx-auto rounded bg-[#18191d] border border-[#26282e] flex items-center justify-center text-[#8E9299] mb-3">
            <Calendar className="w-6 h-6 text-[#F27D26]" />
          </div>
          <h3 className="text-base font-mono font-bold text-[#E4E7EB]">
            No data available for this date
          </h3>
          <p className="text-xs text-[#8E9299] max-w-md mx-auto mt-1">
            No sensor readings found in the database for node <span className="text-[#F27D26] font-mono font-bold">{selectedDeviceId}</span> on {mode === 'single' ? selectedDate : `${startDate} to ${endDate}`}.
            Try selecting another date or check presets like August 25.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tilt Chart */}
          {(sensorType === 'all' || sensorType === 'tilt') && (
            <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md">
              <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB]">
                    Tilt Incline Vector ({selectedDeviceId} - {mode === 'single' ? selectedDate : `${startDate} to ${endDate}`})
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#8E9299]">{readings.length} Database Records</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26282e" />
                    <XAxis dataKey="time" stroke="#8E9299" fontSize={10} tickLine={false} />
                    <YAxis stroke="#8E9299" fontSize={10} tickLine={false} unit="°" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#151619',
                        borderColor: '#26282e',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        color: '#E4E7EB'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="tilt_mag" name="Tilt Magnitude (°)" stroke="#F27D26" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="tilt_x" name="Tilt X (°)" stroke="#00D26A" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="tilt_y" name="Tilt Y (°)" stroke="#A855F7" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Vibration Chart */}
          {(sensorType === 'all' || sensorType === 'vibration') && (
            <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md">
              <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00D26A]" />
                  <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB]">
                    Dynamic Vibration Analysis ({selectedDeviceId})
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#8E9299]">Max: {stats.max_vibration.toFixed(2)}</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="vibGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D26A" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00D26A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26282e" />
                    <XAxis dataKey="time" stroke="#8E9299" fontSize={10} tickLine={false} />
                    <YAxis stroke="#8E9299" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#151619',
                        borderColor: '#26282e',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        color: '#E4E7EB'
                      }}
                    />
                    <Area type="monotone" dataKey="vibration" name="Vibration" stroke="#00D26A" strokeWidth={2} fillOpacity={1} fill="url(#vibGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Risk Level Chart */}
          {(sensorType === 'all' || sensorType === 'risk') && (
            <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md">
              <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-[#FF3B30]" />
                  <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB]">
                    AI/ML Subsidence Risk Score Evolution (0-100)
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#8E9299]">Threshold: Safe &lt;40 | Warn 40-69 | Danger ≥70</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="risk_score" name="Risk Score (0-100)" stroke="#FF3B30" strokeWidth={2} fillOpacity={1} fill="url(#riskGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
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
