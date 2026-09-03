import React, { useState } from 'react';
import { Radio, X, Send, Play, Square, Cpu, ShieldAlert } from 'lucide-react';
import type { Device } from '../types.ts';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  simulatorActive: boolean;
  onRefreshData: () => void;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  devices,
  simulatorActive,
  onRefreshData
}) => {
  if (!isOpen) return null;

  const [simNode, setSimNode] = useState('NODE-001');
  const [scenario, setScenario] = useState<
    'normal' | 'increasing_tilt' | 'increasing_vibration' | 'warning' | 'danger'
  >('normal');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: simNode, scenario })
      });
      onRefreshData();
    } catch (err) {
      console.error('Simulator error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleLoop = async () => {
    try {
      await fetch('/api/simulator/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !simulatorActive, scenario })
      });
      onRefreshData();
    } catch (err) {
      console.error('Toggle loop error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-mono font-bold uppercase text-slate-100">
              Hardware Sensor Simulator (Demo Lab)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xs font-mono"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-mono text-slate-400 leading-relaxed">
          Inject sample packets to test real-time graph rendering, AI risk prediction scoring, and automatic GSM alert dispatching.
        </p>

        <div className="space-y-4 text-xs font-mono">
          <div>
            <label className="block uppercase text-slate-400 mb-1">Target Hardware Node:</label>
            <select
              value={simNode}
              onChange={e => setSimNode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-amber-400 rounded-lg p-2.5 focus:outline-none focus:border-amber-500"
            >
              {devices.map(d => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_id} — {d.device_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block uppercase text-slate-400 mb-1">Geotechnical Condition:</label>
            <select
              value={scenario}
              onChange={e => setScenario(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-amber-500"
            >
              <option value="normal">Normal Strata Stability (Safe &lt;0.8°)</option>
              <option value="increasing_tilt">Continuous Tilt Incline (+0.15°/step)</option>
              <option value="increasing_vibration">Accelerating Strata Vibration (+0.3/step)</option>
              <option value="warning">Warning Hazard (~1.3° Tilt, 2.2 Vib)</option>
              <option value="danger">Danger Collapse (~2.6° Tilt, 3.8 Vib, Auto SMS)</option>
            </select>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Injecting Telemetry...' : 'Send Single Telemetry Packet'}
            </button>

            <button
              type="button"
              onClick={handleToggleLoop}
              className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 ${
                simulatorActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {simulatorActive ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Stop Background Loop
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Start Continuous Simulation (4s loop)
                </>
              )}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          <span>All simulated readings stored directly in SQLite as DEMO DATA.</span>
        </div>
      </div>
    </div>
  );
};
