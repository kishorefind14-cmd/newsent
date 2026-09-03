import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, TabType } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { LiveMonitoringView } from './components/LiveMonitoringView.tsx';
import { HistoricalAnalysisView } from './components/HistoricalAnalysisView.tsx';
import { RiskPredictionView } from './components/RiskPredictionView.tsx';
import { AlertsView } from './components/AlertsView.tsx';
import { ChatbotView } from './components/ChatbotView.tsx';
import { DevicesView } from './components/DevicesView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { ArchitectureView } from './components/ArchitectureView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { LeafletMap } from './components/LeafletMap.tsx';
import { SimulatorModal } from './components/SimulatorModal.tsx';
import type { Device, SensorReading, SystemStats, SmsAlert, RiskPrediction } from './types.ts';
import { MapPin, Filter, Radio, Compass, Activity, ShieldAlert, AlertOctagon, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('NODE-001');

  // Application Data States
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [alerts, setAlerts] = useState<SmsAlert[]>([]);
  const [recentReadings, setRecentReadings] = useState<SensorReading[]>([]);

  // Simulator & UI States
  const [simulatorActive, setSimulatorActive] = useState<boolean>(false);
  const [simulatorModalOpen, setSimulatorModalOpen] = useState<boolean>(false);
  const [mapFilter, setMapFilter] = useState<'ALL' | 'SAFE' | 'WARNING' | 'DANGER'>('ALL');

  // Initial Data Fetch
  const loadInitialData = useCallback(async () => {
    try {
      // Fetch devices
      const devRes = await fetch('/api/devices');
      const devData: Device[] = await devRes.json();
      setDevices(devData);

      // Fetch stats
      const statsRes = await fetch('/api/stats');
      const statsData: SystemStats = await statsRes.json();
      setStats(statsData);

      // Fetch alerts
      const alertsRes = await fetch('/api/alerts?limit=50');
      const alertsData: SmsAlert[] = await alertsRes.json();
      setAlerts(alertsData);

      // Fetch recent readings for dashboard
      const recentRes = await fetch('/api/sensor-data/recent?limit=25');
      const recentData: SensorReading[] = await recentRes.json();
      setRecentReadings(recentData);

      // Fetch simulator status
      const simRes = await fetch('/api/simulator/status');
      const simData = await simRes.json();
      setSimulatorActive(Boolean(simData.active));
    } catch (err) {
      console.error('Initial data fetch error:', err);
    }
  }, []);

  // Fetch device-specific telemetry
  const loadDeviceData = useCallback(async (deviceId: string) => {
    try {
      const histRes = await fetch(`/api/devices/${deviceId}/history?limit=30`);
      const histData: SensorReading[] = await histRes.json();
      // Reverse so oldest is first for time-series charts
      const sorted = [...histData].reverse();
      setReadings(sorted);

      if (sorted.length > 0) {
        setLatestReading(sorted[sorted.length - 1]);
      }

      // Fetch risk prediction
      const riskRes = await fetch(`/api/risk/${deviceId}`);
      if (riskRes.ok) {
        const riskData: RiskPrediction = await riskRes.json();
        setPrediction(riskData);
      }
    } catch (err) {
      console.error(`Error loading device telemetry for ${deviceId}:`, err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (selectedDeviceId) {
      loadDeviceData(selectedDeviceId);
    }
  }, [selectedDeviceId, loadDeviceData]);

  // Real-time Event Stream (SSE) Integration (Section 3 & 26)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'sensor_reading') {
            const { reading, prediction: newPred, stats: newStats } = payload.payload;

            // Update stats
            if (newStats) setStats(newStats);

            // Update recent readings
            setRecentReadings(prev => [reading, ...prev.slice(0, 24)]);

            // Update device list with new telemetry
            setDevices(prev =>
              prev.map(d =>
                d.device_id === reading.device_id
                  ? {
                      ...d,
                      current_tilt: reading.tilt_magnitude,
                      current_vibration: reading.vibration,
                      current_risk_level: reading.risk_level,
                      current_risk_score: reading.risk_score,
                      last_seen: reading.timestamp
                    }
                  : d
              )
            );

            // If reading matches currently selected device, append to live chart
            if (reading.device_id === selectedDeviceId) {
              setLatestReading(reading);
              setPrediction(newPred);
              setReadings(prev => {
                const updated = [...prev, reading];
                return updated.slice(-35); // Keep last 35 points in view
              });
            }
          } else if (payload.type === 'new_alert') {
            // Re-fetch alerts
            fetch('/api/alerts?limit=50')
              .then(r => r.json())
              .then(setAlerts)
              .catch(() => {});
          } else if (payload.type === 'devices_updated') {
            setDevices(payload.payload);
          }
        } catch (e) {
          console.error('Error handling SSE payload:', e);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch (err) {
      console.warn('SSE not available, relying on local sync:', err);
    }

    return () => {
      eventSource?.close();
    };
  }, [selectedDeviceId]);

  const handleSelectDevice = (id: string) => {
    setSelectedDeviceId(id);
  };

  const dangerCount = devices.filter(d => d.current_risk_level === 'DANGER').length;
  const filteredMapDevices = devices.filter(d => {
    if (mapFilter === 'ALL') return true;
    return d.current_risk_level === mapFilter;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#E4E7EB] flex flex-col font-sans selection:bg-[#F27D26] selection:text-black">
      {/* Top Header Navbar */}
      <Navbar
        stats={stats}
        simulatorActive={simulatorActive}
        onToggleSimulatorModal={() => setSimulatorModalOpen(true)}
        onRefreshData={() => {
          loadInitialData();
          loadDeviceData(selectedDeviceId);
        }}
        activeAlertCount={alerts.length}
      />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          dangerCount={dangerCount}
          unreadAlertsCount={alerts.filter(a => a.sent).length}
        />

        {/* Main Content View Container */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              devices={devices}
              readings={readings}
              latestReading={latestReading}
              latestPrediction={prediction}
              recentAlerts={alerts}
              recentReadings={recentReadings}
              onNavigateTab={tab => setCurrentTab(tab as TabType)}
              onSelectDevice={handleSelectDevice}
              selectedDeviceId={selectedDeviceId}
            />
          )}

          {currentTab === 'live' && (
            <LiveMonitoringView
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={handleSelectDevice}
              readings={readings}
              latestReading={latestReading}
              prediction={prediction}
            />
          )}

          {currentTab === 'map' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#121316] border border-[#26282e] p-3.5 rounded">
                <div>
                  <h2 className="text-base font-bold font-mono text-[#E4E7EB] uppercase flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#F27D26]" />
                    Distributed Hardware Node GPS Location Map
                  </h2>
                  <p className="text-xs text-[#8E9299]">
                    Real-time coordinates and geomechanical risk status in underground coal extraction sector
                  </p>
                </div>

                {/* Map Filters */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#8E9299] uppercase tracking-wider">Filter:</span>
                  {(['ALL', 'SAFE', 'WARNING', 'DANGER'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setMapFilter(filter)}
                      className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                        mapFilter === filter
                          ? 'bg-[#F27D26] text-black font-bold border-[#F27D26]'
                          : 'bg-[#18191d] text-[#8E9299] border-[#26282e] hover:text-[#E4E7EB] hover:border-[#353840]'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#121316] border border-[#26282e] rounded p-3 shadow-xl">
                <LeafletMap
                  devices={filteredMapDevices}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={handleSelectDevice}
                  height="600px"
                  zoom={15}
                />
              </div>
            </div>
          )}

          {currentTab === 'history' && (
            <HistoricalAnalysisView
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={handleSelectDevice}
            />
          )}

          {currentTab === 'risk' && (
            <RiskPredictionView
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={handleSelectDevice}
              prediction={prediction}
              readings={readings}
            />
          )}

          {currentTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              devices={devices}
              onTriggerTestAlert={() => {
                loadInitialData();
              }}
            />
          )}

          {currentTab === 'assistant' && <ChatbotView />}

          {currentTab === 'devices' && (
            <DevicesView
              devices={devices}
              onSelectDevice={handleSelectDevice}
              onNavigateTab={tab => setCurrentTab(tab as TabType)}
              onRefreshDevices={loadInitialData}
            />
          )}

          {currentTab === 'reports' && <ReportsView devices={devices} />}

          {currentTab === 'architecture' && <ArchitectureView />}

          {currentTab === 'settings' && (
            <SettingsView
              devices={devices}
              simulatorActive={simulatorActive}
              onRefreshData={() => {
                loadInitialData();
                loadDeviceData(selectedDeviceId);
              }}
            />
          )}
        </main>
      </div>

      {/* Simulator Modal Component */}
      <SimulatorModal
        isOpen={simulatorModalOpen}
        onClose={() => setSimulatorModalOpen(false)}
        devices={devices}
        simulatorActive={simulatorActive}
        onRefreshData={() => {
          loadInitialData();
          loadDeviceData(selectedDeviceId);
        }}
      />
    </div>
  );
}
