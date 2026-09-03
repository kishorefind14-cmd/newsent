import React, { useState, useEffect } from 'react';
import {
  Bell,
  MessageSquare,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Search,
  Filter,
  Send,
  Radio,
  Clock,
  HardDrive
} from 'lucide-react';
import type { SmsAlert, Device } from '../types.ts';

interface AlertsViewProps {
  alerts: SmsAlert[];
  devices: Device[];
  onTriggerTestAlert: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, devices, onTriggerTestAlert }) => {
  const [filterDevice, setFilterDevice] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [testNode, setTestNode] = useState<string>('NODE-001');
  const [testMessage, setTestMessage] = useState<string>('');
  const [drillSending, setDrillSending] = useState<boolean>(false);

  const filteredAlerts = alerts.filter(a => {
    if (filterDevice !== 'ALL' && a.device_id !== filterDevice) return false;
    if (filterLevel === 'DANGER' && !a.alert_type.toUpperCase().includes('DANGER')) return false;
    if (filterLevel === 'WARNING' && !a.alert_type.toUpperCase().includes('WARNING')) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.device_id.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.alert_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSendTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrillSending(true);
    try {
      await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: testNode,
          alert_type: 'EMERGENCY DRILL ALERT',
          message:
            testMessage ||
            `Mine Sentinel Safety Drill: Evacuation verification for ${testNode}. Time: ${new Date().toISOString()}`
        })
      });
      onTriggerTestAlert();
      setTestModalOpen(false);
      setTestMessage('');
    } catch (err) {
      console.error('Test drill error:', err);
    } finally {
      setDrillSending(false);
    }
  };

  const dangerAlertsCount = alerts.filter(a => a.alert_type.includes('DANGER')).length;
  const warningAlertsCount = alerts.filter(a => a.alert_type.includes('WARNING')).length;
  const totalSmsSent = alerts.filter(a => a.sent).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#E4E7EB] uppercase flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#F27D26]" />
            Alert Management & GSM SMS Dispatch History
          </h2>
          <p className="text-xs text-[#8E9299]">
            Audit log of all automatic threshold triggers, geotechnical warnings, and outbound emergency SMS
          </p>
        </div>

        <button
          onClick={() => setTestModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded bg-[#F27D26] hover:bg-[#ff9142] text-[#0a0a0b] font-mono text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          Dispatch Safety Drill Alert
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md text-center">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Total System Alerts</span>
          <div className="text-2xl font-mono font-bold text-[#E4E7EB] mt-1">{alerts.length}</div>
          <span className="text-[10px] text-[#8E9299] font-mono">Logged to SQLite</span>
        </div>

        <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md text-center">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Danger Alerts</span>
          <div className="text-2xl font-mono font-bold text-[#FF3B30] mt-1">{dangerAlertsCount}</div>
          <span className="text-[10px] text-[#FF3B30]/80 font-mono">High Hazard Subsidence</span>
        </div>

        <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md text-center">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">Warning Alerts</span>
          <div className="text-2xl font-mono font-bold text-[#F27D26] mt-1">{warningAlertsCount}</div>
          <span className="text-[10px] text-[#F27D26]/80 font-mono">Early Tension Shift</span>
        </div>

        <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md text-center">
          <span className="text-[10px] uppercase font-mono text-[#8E9299] font-bold">SMS Dispatched</span>
          <div className="text-2xl font-mono font-bold text-[#A855F7] mt-1">{totalSmsSent}</div>
          <span className="text-[10px] text-[#A855F7]/80 font-mono">SIM800L / Twilio GSM</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#121316] border border-[#26282e] rounded p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#8E9299] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search alert log or message text..."
              className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] text-xs font-mono rounded pl-9 pr-3 py-2 focus:outline-none focus:border-[#F27D26]"
            />
          </div>

          {/* Node Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-[#8E9299] uppercase font-bold tracking-wider">Node:</span>
            <select
              value={filterDevice}
              onChange={e => setFilterDevice(e.target.value)}
              className="bg-[#18191d] border border-[#26282e] text-[#F27D26] text-xs font-mono rounded px-2.5 py-2 focus:outline-none focus:border-[#F27D26]"
            >
              <option value="ALL">All Nodes</option>
              {devices.map(d => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_id}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-[#8E9299] uppercase font-bold tracking-wider">Severity:</span>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="bg-[#18191d] border border-[#26282e] text-[#E4E7EB] text-xs font-mono rounded px-2.5 py-2 focus:outline-none focus:border-[#F27D26]"
            >
              <option value="ALL">All Severities</option>
              <option value="DANGER">DANGER Only</option>
              <option value="WARNING">WARNING Only</option>
            </select>
          </div>
        </div>

        <span className="text-xs font-mono text-[#8E9299]">
          Showing {filteredAlerts.length} of {alerts.length} logs
        </span>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#121316] border border-[#26282e] rounded overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#18191d] border-b border-[#26282e] text-[#8E9299] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Device Node</th>
                <th className="p-3.5">Alert Classification</th>
                <th className="p-3.5">Alert Notification Message</th>
                <th className="p-3.5">SMS Status</th>
                <th className="p-3.5">Dispatch Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26282e]">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8E9299] font-mono">
                    No alert logs matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-[#18191d]/60 transition-colors">
                    <td className="p-3.5 text-[#8E9299] whitespace-nowrap">
                      {formatDateTime(alert.sent_time || '')}
                    </td>
                    <td className="p-3.5 font-bold text-[#F27D26] whitespace-nowrap">
                      {alert.device_id}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          alert.alert_type.includes('DANGER')
                            ? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/40'
                            : alert.alert_type.includes('WARNING')
                            ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/40'
                            : 'bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/40'
                        }`}
                      >
                        {alert.alert_type}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#E4E7EB] max-w-md">
                      {alert.message}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {alert.sent ? (
                        <span className="flex items-center gap-1.5 text-[#00D26A]">
                          <CheckCircle className="w-3.5 h-3.5" /> Delivered
                        </span>
                      ) : (
                        <span className="text-[#8E9299]">Queued</span>
                      )}
                    </td>
                    <td className="p-3.5 text-[#8E9299] whitespace-nowrap">
                      {alert.sent_time ? formatTimeOnly(alert.sent_time) : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Drill Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-[#26282e] rounded p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#26282e] pb-3">
              <h3 className="text-sm font-mono font-bold uppercase text-[#E4E7EB] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#FF3B30]" />
                Dispatch Geotechnical Safety Drill Alert
              </h3>
              <button
                onClick={() => setTestModalOpen(false)}
                className="text-[#8E9299] hover:text-[#E4E7EB] text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTestAlert} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block uppercase text-[#8E9299] font-bold tracking-wider mb-1">Target Hardware Node:</label>
                <select
                  value={testNode}
                  onChange={e => setTestNode(e.target.value)}
                  className="w-full bg-[#18191d] border border-[#26282e] text-[#F27D26] rounded p-2.5 focus:outline-none focus:border-[#F27D26]"
                >
                  {devices.map(d => (
                    <option key={d.device_id} value={d.device_id}>
                      {d.device_id} — {d.device_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block uppercase text-[#8E9299] font-bold tracking-wider mb-1">Custom Alert Message (Optional):</label>
                <textarea
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  placeholder="Mine Sentinel Emergency Test: Surface crack displacement drill underway on Panel B. Evacuate zone."
                  className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded p-2.5 h-24 focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 rounded bg-[#18191d] hover:bg-[#26282e] text-[#8E9299] hover:text-[#E4E7EB] font-mono border border-[#26282e] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={drillSending}
                  className="px-4 py-2 rounded bg-[#FF3B30] hover:bg-[#ff544a] disabled:opacity-50 text-white font-mono font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {drillSending ? 'Dispatching...' : 'Dispatch Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return iso;
  }
}

function formatTimeOnly(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}
