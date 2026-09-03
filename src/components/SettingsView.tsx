import React, { useState, useEffect } from 'react';
import {
  Settings,
  Radio,
  Sliders,
  Bell,
  Cpu,
  Save,
  CheckCircle,
  Play,
  Square,
  Send,
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import type { Device } from '../types.ts';

interface SettingsViewProps {
  devices: Device[];
  simulatorActive: boolean;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  devices,
  simulatorActive,
  onRefreshData
}) => {
  const [safeMax, setSafeMax] = useState(39);
  const [warningMax, setWarningMax] = useState(69);
  const [tiltWarningThreshold, setTiltWarningThreshold] = useState(0.8);
  const [tiltDangerThreshold, setTiltDangerThreshold] = useState(2.0);
  const [vibrationWarningThreshold, setVibrationWarningThreshold] = useState(1.5);
  const [vibrationDangerThreshold, setVibrationDangerThreshold] = useState(2.8);
  const [alertPhoneNumber, setAlertPhoneNumber] = useState('+91-9876543210');
  const [autoSmsDanger, setAutoSmsDanger] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Simulator state
  const [simNode, setSimNode] = useState('NODE-001');
  const [scenario, setScenario] = useState<
    'normal' | 'increasing_tilt' | 'increasing_vibration' | 'warning' | 'danger'
  >('normal');
  const [simSending, setSimSending] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.safe_max !== undefined) setSafeMax(data.safe_max);
          if (data.warning_max !== undefined) setWarningMax(data.warning_max);
          if (data.tilt_warning_threshold !== undefined) setTiltWarningThreshold(data.tilt_warning_threshold);
          if (data.tilt_danger_threshold !== undefined) setTiltDangerThreshold(data.tilt_danger_threshold);
          if (data.vibration_warning_threshold !== undefined) setVibrationWarningThreshold(data.vibration_warning_threshold);
          if (data.vibration_danger_threshold !== undefined) setVibrationDangerThreshold(data.vibration_danger_threshold);
          if (data.alert_phone_number !== undefined) setAlertPhoneNumber(data.alert_phone_number);
          if (data.auto_sms_danger !== undefined) setAutoSmsDanger(Boolean(data.auto_sms_danger));
        }
      })
      .catch(err => console.error('Failed to load settings:', err));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          safe_max: Number(safeMax),
          warning_max: Number(warningMax),
          tilt_warning_threshold: Number(tiltWarningThreshold),
          tilt_danger_threshold: Number(tiltDangerThreshold),
          vibration_warning_threshold: Number(vibrationWarningThreshold),
          vibration_danger_threshold: Number(vibrationDangerThreshold),
          alert_phone_number: alertPhoneNumber,
          auto_sms_danger: autoSmsDanger
        })
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      onRefreshData();
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendSingleSimPacket = async () => {
    setSimSending(true);
    try {
      await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: simNode,
          scenario
        })
      });
      onRefreshData();
    } catch (err) {
      console.error('Simulator single packet error:', err);
    } finally {
      setSimSending(false);
    }
  };

  const handleToggleContinuousSim = async () => {
    try {
      await fetch('/api/simulator/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: !simulatorActive,
          scenario
        })
      });
      onRefreshData();
    } catch (err) {
      console.error('Toggle simulator error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-mono text-[#E4E7EB] uppercase flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#F27D26]" />
          System Configuration & IoT Telemetry Simulator
        </h2>
        <p className="text-xs text-[#8E9299]">
          Geotechnical threshold calibrations, automated GSM SMS alert recipients, and hardware emulator controls
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Thresholds and Settings (Section 22, 23, 24) */}
        <div className="lg:col-span-7 bg-[#121316] border border-[#26282e] rounded p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-4">
            <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#F27D26]" />
              Safety Thresholds & Geological Parameters
            </h3>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs font-mono text-[#00D26A]">
                <CheckCircle className="w-3.5 h-3.5" /> Saved to DB
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs font-mono">
            {/* Risk Score Ranges */}
            <div className="space-y-2">
              <span className="text-[#F27D26] uppercase font-bold tracking-wider block">AI Risk Score Boundaries (0-100):</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e]">
                  <label className="block text-[#8E9299] mb-1">Safe Max Threshold (Default 39):</label>
                  <input
                    type="number"
                    value={safeMax}
                    onChange={e => setSafeMax(Number(e.target.value))}
                    min={10}
                    max={60}
                    className="w-full bg-[#18191d] border border-[#26282e] text-[#00D26A] font-bold rounded p-2 focus:outline-none focus:border-[#F27D26]"
                  />
                  <span className="text-[10px] text-[#8E9299] mt-1 block">Scores ≤ this are SAFE</span>
                </div>
                <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e]">
                  <label className="block text-[#8E9299] mb-1">Warning Max Threshold (Default 69):</label>
                  <input
                    type="number"
                    value={warningMax}
                    onChange={e => setWarningMax(Number(e.target.value))}
                    min={40}
                    max={85}
                    className="w-full bg-[#18191d] border border-[#26282e] text-[#F27D26] font-bold rounded p-2 focus:outline-none focus:border-[#F27D26]"
                  />
                  <span className="text-[10px] text-[#8E9299] mt-1 block">Scores &gt; this are DANGER</span>
                </div>
              </div>
            </div>

            {/* Inclinometer and Vibration Thresholds */}
            <div className="space-y-2">
              <span className="text-[#F27D26] uppercase font-bold tracking-wider block">Physical Sensor Trigger Limits:</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e]">
                  <label className="block text-[#8E9299] mb-1">Tilt Warning (°):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tiltWarningThreshold}
                    onChange={e => setTiltWarningThreshold(Number(e.target.value))}
                    className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded p-2 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
                <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e]">
                  <label className="block text-[#8E9299] mb-1">Tilt Danger Hazard (°):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tiltDangerThreshold}
                    onChange={e => setTiltDangerThreshold(Number(e.target.value))}
                    className="w-full bg-[#18191d] border border-[#26282e] text-[#FF3B30] font-bold rounded p-2 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
                <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e]">
                  <label className="block text-[#8E9299] mb-1">Vibration Warning Level:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vibrationWarningThreshold}
                    onChange={e => setVibrationWarningThreshold(Number(e.target.value))}
                    className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded p-2 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
                <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e]">
                  <label className="block text-[#8E9299] mb-1">Vibration Danger Level:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vibrationDangerThreshold}
                    onChange={e => setVibrationDangerThreshold(Number(e.target.value))}
                    className="w-full bg-[#18191d] border border-[#26282e] text-[#FF3B30] font-bold rounded p-2 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
              </div>
            </div>

            {/* GSM Emergency Alert Settings */}
            <div className="space-y-2">
              <span className="text-[#F27D26] uppercase font-bold tracking-wider block">GSM SMS Alert Recipients:</span>
              <div className="bg-[#0a0a0b] p-3 rounded border border-[#26282e] space-y-3">
                <div>
                  <label className="block text-[#8E9299] mb-1">Emergency Officer Mobile (+Country Code):</label>
                  <input
                    type="text"
                    value={alertPhoneNumber}
                    onChange={e => setAlertPhoneNumber(e.target.value)}
                    className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded p-2 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
                <label className="flex items-center gap-2 text-[#E4E7EB] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSmsDanger}
                    onChange={e => setAutoSmsDanger(e.target.checked)}
                    className="rounded bg-[#18191d] border-[#26282e] text-[#F27D26] focus:ring-0"
                  />
                  <span>Automatically dispatch SMS alert on DANGER level detection</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded bg-[#F27D26] hover:bg-[#ff9142] disabled:opacity-50 text-[#0a0a0b] font-bold uppercase transition-colors cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Updating...' : 'Save Configuration to Database'}
            </button>
          </form>
        </div>

        {/* Right 5 Cols: Hardware Sensor Simulator (Section 31) */}
        <div className="lg:col-span-5 bg-[#121316] border border-[#26282e] rounded p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#26282e] pb-3 mb-4">
              <h3 className="font-mono text-sm font-semibold uppercase text-[#E4E7EB] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#F27D26]" />
                Hardware Sensor Simulator
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
                DEMO LAB
              </span>
            </div>

            <p className="text-xs text-[#8E9299] leading-relaxed mb-4">
              Inject synthetic hardware packets into the real SQLite database and trigger real-time AI risk scoring to evaluate warning transitions.
            </p>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block uppercase text-[#8E9299] mb-1 font-bold tracking-wider">Target Node:</label>
                <select
                  value={simNode}
                  onChange={e => setSimNode(e.target.value)}
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
                <label className="block uppercase text-[#8E9299] mb-1 font-bold tracking-wider">Geotechnical Scenario:</label>
                <select
                  value={scenario}
                  onChange={e => setScenario(e.target.value as any)}
                  className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded p-2.5 focus:outline-none focus:border-[#F27D26]"
                >
                  <option value="normal">Normal Strata Stability (Safe &lt;0.8°)</option>
                  <option value="increasing_tilt">Continuous Tilt Incline (+0.15°/step)</option>
                  <option value="increasing_vibration">Accelerating Strata Vibration (+0.3/step)</option>
                  <option value="warning">Warning Threshold Breach (~1.3° Tilt, 2.2 Vib)</option>
                  <option value="danger">Critical Subsidence Collapse (~2.6° Tilt, 3.8 Vib)</option>
                </select>
              </div>

              {/* Single Trigger vs Loop */}
              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={handleSendSingleSimPacket}
                  disabled={simSending}
                  className="w-full py-2.5 rounded bg-[#18191d] hover:bg-[#26282e] border border-[#26282e] text-[#E4E7EB] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#F27D26]" />
                  {simSending ? 'Injecting Telemetry...' : 'Send Single Telemetry Packet'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleContinuousSim}
                  className={`w-full py-2.5 rounded font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    simulatorActive
                      ? 'bg-[#FF3B30] hover:bg-[#ff5449] text-white shadow-md'
                      : 'bg-[#F27D26] hover:bg-[#ff9142] text-[#0a0a0b] shadow-md'
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
          </div>

          <div className="mt-6 p-3 rounded bg-[#0a0a0b] border border-[#26282e] text-[11px] font-mono text-[#8E9299] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#F27D26] shrink-0" />
            <span>Simulated records are flagged with <strong className="text-[#F27D26]">is_demo: 1</strong> in database for audit transparency.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
