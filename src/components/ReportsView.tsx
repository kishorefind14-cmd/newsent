import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  HardDrive,
  Compass,
  Activity
} from 'lucide-react';
import type { Device, SensorReading } from '../types.ts';

interface ReportsViewProps {
  devices: Device[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ devices }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>('NODE-001');
  const [startDate, setStartDate] = useState<string>('2026-08-20');
  const [endDate, setEndDate] = useState<string>('2026-09-02');
  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<{
    readings: SensorReading[];
    stats: {
      max_tilt: number;
      max_vibration: number;
      warning_count: number;
      danger_count: number;
      sms_alerts_count: number;
    };
  }>({
    readings: [],
    stats: { max_tilt: 0, max_vibration: 0, warning_count: 0, danger_count: 0, sms_alerts_count: 0 }
  });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sensor-data/range?device_id=${selectedDevice}&start_date=${startDate}&end_date=${endDate}`);
      const data = await res.json();
      setReportData({
        readings: data.readings || [],
        stats: data.statistics || { max_tilt: 0, max_vibration: 0, warning_count: 0, danger_count: 0, sms_alerts_count: 0 }
      });
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDevice, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportData.readings.length === 0) return;
    const headers = ['Timestamp', 'Device_ID', 'Tilt_X', 'Tilt_Y', 'Tilt_Magnitude', 'Vibration', 'Risk_Level', 'Risk_Score', 'SMS_Sent'];
    const rows = reportData.readings.map(r => [
      r.timestamp,
      r.device_id,
      r.tilt_x,
      r.tilt_y,
      r.tilt_magnitude,
      r.vibration,
      r.risk_level,
      r.risk_score,
      r.sms_sent ? 'YES' : 'NO'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `mine_sentinel_report_${selectedDevice}_${startDate}_${endDate}.csv`;
    link.click();
  };

  const currentDevObj = devices.find(d => d.device_id === selectedDevice);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#E4E7EB] uppercase flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#F27D26]" />
            Geotechnical Mine Subsidence Compliance Reports
          </h2>
          <p className="text-xs text-[#8E9299]">
            Generate formal strata stability certificates and compliance records for coal regulatory boards
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#18191d] hover:bg-[#26282e] text-[#8E9299] hover:text-[#E4E7EB] text-xs font-mono font-semibold border border-[#26282e] transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
          <button
            onClick={handleExportCSV}
            disabled={reportData.readings.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#F27D26] hover:bg-[#ff9142] disabled:opacity-50 text-[#0a0a0b] text-xs font-mono font-bold transition-colors cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md flex flex-wrap items-center gap-4 text-xs font-mono">
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-[#8E9299] mb-1">Target Station:</label>
          <select
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
            className="bg-[#18191d] border border-[#26282e] text-[#F27D26] rounded px-3 py-2 focus:outline-none focus:border-[#F27D26]"
          >
            {devices.map(d => (
              <option key={d.device_id} value={d.device_id}>
                {d.device_id} — {d.device_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-[#8E9299] mb-1">Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded px-3 py-2 focus:outline-none focus:border-[#F27D26]"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-[#8E9299] mb-1">End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded px-3 py-2 focus:outline-none focus:border-[#F27D26]"
          />
        </div>
      </div>

      {/* Report Document Sheet (Printable) */}
      <div className="bg-[#121316] border border-[#26282e] rounded p-8 shadow-md space-y-6 print:bg-white print:text-black print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="border-b-2 border-[#F27D26]/40 pb-4 flex items-start justify-between">
          <div>
            <div className="text-xl font-bold font-mono text-[#E4E7EB] uppercase tracking-wide">
              MINE SENTINEL SUBSIDENCE AUDIT REPORT
            </div>
            <div className="text-xs text-[#8E9299] mt-0.5">
              Directorate General of Mine Safety (DGMS) Geotechnical Verification
            </div>
          </div>
          <div className="text-right text-xs font-mono text-[#8E9299]">
            <div>Report Date: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div>Ref Code: MS-DGMS-{selectedDevice}-2026</div>
          </div>
        </div>

        {/* Station Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono p-4 rounded bg-[#0a0a0b] border border-[#26282e]">
          <div>
            <span className="text-[#8E9299] block text-[10px] uppercase font-bold tracking-wider">Monitoring Node:</span>
            <span className="font-bold text-[#F27D26]">{selectedDevice}</span>
          </div>
          <div>
            <span className="text-[#8E9299] block text-[10px] uppercase font-bold tracking-wider">Installation Zone:</span>
            <span className="text-[#E4E7EB]">{currentDevObj?.installation_location || 'Underground Sector'}</span>
          </div>
          <div>
            <span className="text-[#8E9299] block text-[10px] uppercase font-bold tracking-wider">GPS Coordinates:</span>
            <span className="text-[#E4E7EB]">{currentDevObj?.latitude.toFixed(4)}, {currentDevObj?.longitude.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-[#8E9299] block text-[10px] uppercase font-bold tracking-wider">Reporting Window:</span>
            <span className="text-[#E4E7EB]">{startDate} to {endDate}</span>
          </div>
        </div>

        {/* Statistical Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] text-center">
            <span className="text-[10px] uppercase text-[#8E9299] font-mono font-bold tracking-wider">Total Telemetry</span>
            <div className="text-xl font-bold text-[#E4E7EB] font-mono mt-1">{reportData.readings.length}</div>
            <span className="text-[10px] text-[#8E9299] font-mono">SQLite Samples</span>
          </div>
          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] text-center">
            <span className="text-[10px] uppercase text-[#8E9299] font-mono font-bold tracking-wider">Max Tilt Mag</span>
            <div className="text-xl font-bold text-[#F27D26] font-mono mt-1">{reportData.stats.max_tilt.toFixed(2)}°</div>
            <span className="text-[10px] text-[#8E9299] font-mono">Slope Vector</span>
          </div>
          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] text-center">
            <span className="text-[10px] uppercase text-[#8E9299] font-mono font-bold tracking-wider">Max Vibration</span>
            <div className="text-xl font-bold text-[#00D26A] font-mono mt-1">{reportData.stats.max_vibration.toFixed(2)}</div>
            <span className="text-[10px] text-[#8E9299] font-mono">Velocity Peak</span>
          </div>
          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] text-center">
            <span className="text-[10px] uppercase text-[#8E9299] font-mono font-bold tracking-wider">Warning Events</span>
            <div className="text-xl font-bold text-[#F27D26] font-mono mt-1">{reportData.stats.warning_count}</div>
            <span className="text-[10px] text-[#8E9299] font-mono">40-69 Risk Score</span>
          </div>
          <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] text-center">
            <span className="text-[10px] uppercase text-[#8E9299] font-mono font-bold tracking-wider">Danger Events</span>
            <div className="text-xl font-bold text-[#FF3B30] font-mono mt-1">{reportData.stats.danger_count}</div>
            <span className="text-[10px] text-[#8E9299] font-mono">Emergency GSM</span>
          </div>
        </div>

        {/* Geotechnical Assessment Narrative */}
        <div className="p-4 rounded bg-[#0a0a0b] border border-[#26282e] space-y-2 text-xs font-mono leading-relaxed">
          <div className="font-bold text-[#F27D26] uppercase">Geomechanical Strata Assessment Summary:</div>
          <p className="text-[#E4E7EB]">
            During the monitoring interval from {startDate} to {endDate}, station {selectedDevice} registered a peak tilt of {reportData.stats.max_tilt.toFixed(2)}° and maximum vibration acceleration of {reportData.stats.max_vibration.toFixed(2)}. 
            {reportData.stats.danger_count > 0
              ? ` High-risk strata tension fractures were detected, resulting in ${reportData.stats.danger_count} critical alerts and automated SMS dispatch to safety personnel.`
              : ` Sensor vectors indicate acceptable strata integrity within regulatory subsidence trough boundary limits.`}
          </p>
        </div>

        {/* Sample Log Excerpt */}
        <div>
          <div className="text-xs font-bold font-mono text-[#E4E7EB] uppercase mb-2">
            Audit Trail Excerpt (Latest Readings in Selected Range):
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0a0a0b] border-b border-[#26282e] text-[#8E9299] text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">Tilt Mag</th>
                  <th className="p-2">Tilt X / Y</th>
                  <th className="p-2">Vibration</th>
                  <th className="p-2">Risk Score</th>
                  <th className="p-2">Risk Level</th>
                  <th className="p-2">SMS Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282e] text-[#E4E7EB]">
                {reportData.readings.slice(0, 8).map(r => (
                  <tr key={r.id}>
                    <td className="p-2 text-[#8E9299]">{r.timestamp.replace('T', ' ').substring(0, 19)}</td>
                    <td className="p-2 text-[#F27D26] font-bold">{r.tilt_magnitude.toFixed(2)}°</td>
                    <td className="p-2 text-[#8E9299]">{r.tilt_x.toFixed(2)}° / {r.tilt_y.toFixed(2)}°</td>
                    <td className="p-2 text-[#00D26A] font-semibold">{r.vibration.toFixed(2)}</td>
                    <td className="p-2 font-bold">{r.risk_score}/100</td>
                    <td className="p-2 uppercase">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        r.risk_level === 'DANGER' ? 'text-[#FF3B30] bg-[#FF3B30]/10 border border-[#FF3B30]/30' :
                        r.risk_level === 'WARNING' ? 'text-[#F27D26] bg-[#F27D26]/10 border border-[#F27D26]/30' :
                        'text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/30'
                      }`}>
                        {r.risk_level}
                      </span>
                    </td>
                    <td className="p-2 text-[#8E9299]">{r.sms_sent ? 'Sent' : 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-8 border-t border-[#26282e] grid grid-cols-2 gap-8 text-xs font-mono text-[#8E9299]">
          <div>
            <div className="border-b border-[#26282e] pb-8 mb-2"></div>
            <div className="text-[#E4E7EB] font-bold">Chief Geotechnical Mine Surveyor</div>
            <div className="text-[10px] text-[#8E9299]">DGMS Certified Strata Engineer</div>
          </div>
          <div>
            <div className="border-b border-[#26282e] pb-8 mb-2"></div>
            <div className="text-[#E4E7EB] font-bold">Mine Operations Director</div>
            <div className="text-[10px] text-[#8E9299]">Mine Sentinel Automated Signature Authority</div>
          </div>
        </div>
      </div>
    </div>
  );
};
