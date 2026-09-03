import React, { useState } from 'react';
import {
  HardDrive,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Compass,
  Activity,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react';
import type { Device } from '../types.ts';

interface DevicesViewProps {
  devices: Device[];
  onSelectDevice: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onRefreshDevices: () => void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  devices,
  onSelectDevice,
  onNavigateTab,
  onRefreshDevices
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('10.7905');
  const [lng, setLng] = useState('78.7047');
  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    setEditingDevice(null);
    setDeviceId(`NODE-${String(devices.length + 1).padStart(3, '0')}`);
    setDeviceName(`Surface Station ${devices.length + 1}`);
    setLocation('Mine Subsidence Monitoring Zone');
    setLat('10.7915');
    setLng('78.7055');
    setModalOpen(true);
  };

  const openEditModal = (dev: Device) => {
    setEditingDevice(dev);
    setDeviceId(dev.device_id);
    setDeviceName(dev.device_name);
    setLocation(dev.installation_location);
    setLat(String(dev.latitude));
    setLng(String(dev.longitude));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDevice) {
        // Edit
        await fetch(`/api/devices/${editingDevice.device_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_name: deviceName,
            installation_location: location,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
          })
        });
      } else {
        // Add
        await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceId,
            device_name: deviceName,
            installation_location: location,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
          })
        });
      }
      onRefreshDevices();
      setModalOpen(false);
    } catch (err) {
      console.error('Error saving device:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (devId: string) => {
    if (!confirm(`Are you sure you want to delete ${devId}? Historical readings will remain preserved in database.`)) {
      return;
    }
    try {
      await fetch(`/api/devices/${devId}`, { method: 'DELETE' });
      onRefreshDevices();
    } catch (err) {
      console.error('Error deleting device:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-[#E4E7EB] uppercase flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#F27D26]" />
            Hardware Sensor Node Management & Provisioning
          </h2>
          <p className="text-xs text-[#8E9299]">
            Configure distributed physical ESP32 sensor stations, geographic installation zones, and GPS telemetry
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded bg-[#F27D26] hover:bg-[#ff9142] text-[#0a0a0b] font-mono text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Provision New Node
        </button>
      </div>

      {/* Device Table */}
      <div className="bg-[#121316] border border-[#26282e] rounded overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#18191d] border-b border-[#26282e] text-[#8E9299] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3.5">Device ID</th>
                <th className="p-3.5">Station Name</th>
                <th className="p-3.5">Installation Area</th>
                <th className="p-3.5">GPS Position</th>
                <th className="p-3.5">Tilt (Mag)</th>
                <th className="p-3.5">Vibration</th>
                <th className="p-3.5">Risk Level</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26282e]">
              {devices.map(dev => (
                <tr key={dev.device_id} className="hover:bg-[#18191d]/60 transition-colors">
                  <td className="p-3.5 font-bold text-[#F27D26] whitespace-nowrap">
                    {dev.device_id}
                  </td>
                  <td className="p-3.5 text-[#E4E7EB] font-medium whitespace-nowrap">
                    {dev.device_name}
                  </td>
                  <td className="p-3.5 text-[#8E9299]">
                    {dev.installation_location}
                  </td>
                  <td className="p-3.5 text-[#8E9299] whitespace-nowrap">
                    {dev.latitude.toFixed(4)}, {dev.longitude.toFixed(4)}
                  </td>
                  <td className="p-3.5 font-semibold text-[#F27D26] whitespace-nowrap">
                    {(dev.current_tilt ?? 0).toFixed(2)}°
                  </td>
                  <td className="p-3.5 font-semibold text-[#00D26A] whitespace-nowrap">
                    {(dev.current_vibration ?? 0).toFixed(2)}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        dev.current_risk_level === 'DANGER'
                          ? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/40 animate-pulse'
                          : dev.current_risk_level === 'WARNING'
                          ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/40'
                          : 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/40'
                      }`}
                    >
                      {dev.current_risk_level || 'SAFE'} ({dev.current_risk_score ?? 0})
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {dev.status === 'ONLINE' ? (
                      <span className="flex items-center gap-1.5 text-[#00D26A]">
                        <span className="w-2 h-2 rounded-full bg-[#00D26A]"></span> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[#8E9299]">
                        <span className="w-2 h-2 rounded-full bg-[#8E9299]"></span> Offline
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          onSelectDevice(dev.device_id);
                          onNavigateTab('map');
                        }}
                        className="p-1.5 rounded hover:bg-[#18191d] text-[#F27D26] hover:text-[#ff9142] cursor-pointer"
                        title="View on GPS Map"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(dev)}
                        className="p-1.5 rounded hover:bg-[#18191d] text-[#8E9299] hover:text-[#E4E7EB] cursor-pointer"
                        title="Edit Node"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dev.device_id)}
                        className="p-1.5 rounded hover:bg-[#18191d] text-[#FF3B30] hover:text-[#ff544a] cursor-pointer"
                        title="Delete Node"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-[#26282e] rounded p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#26282e] pb-3">
              <h3 className="text-sm font-mono font-bold uppercase text-[#E4E7EB] flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#F27D26]" />
                {editingDevice ? `Configure ${editingDevice.device_id}` : 'Provision New Hardware Node'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#8E9299] hover:text-[#E4E7EB] text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block uppercase text-[#8E9299] font-bold tracking-wider mb-1">Device ID (Hardware Key):</label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={e => setDeviceId(e.target.value.toUpperCase())}
                  disabled={Boolean(editingDevice)}
                  required
                  placeholder="NODE-006"
                  className="w-full bg-[#18191d] border border-[#26282e] text-[#F27D26] rounded p-2.5 disabled:opacity-60 focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#8E9299] font-bold tracking-wider mb-1">Station Name:</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={e => setDeviceName(e.target.value)}
                  required
                  placeholder="Surface Pillar Station North"
                  className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded p-2.5 focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block uppercase text-[#8E9299] font-bold tracking-wider mb-1">Installation Location / Mine Panel:</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  required
                  placeholder="Overburden Longwall Panel C-4"
                  className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded p-2.5 focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-[#8E9299] font-bold tracking-wider mb-1">GPS Latitude:</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={e => setLat(e.target.value)}
                    required
                    className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded p-2.5 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
                <div>
                  <label className="block uppercase text-[#8E9299] font-bold tracking-wider mb-1">GPS Longitude:</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={e => setLng(e.target.value)}
                    required
                    className="w-full bg-[#18191d] border border-[#26282e] text-[#E4E7EB] rounded p-2.5 focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#26282e]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded bg-[#18191d] hover:bg-[#26282e] text-[#8E9299] hover:text-[#E4E7EB] font-mono border border-[#26282e] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded bg-[#F27D26] hover:bg-[#ff9142] disabled:opacity-50 text-[#0a0a0b] font-mono font-bold cursor-pointer"
                >
                  {saving ? 'Saving...' : editingDevice ? 'Update Node' : 'Provision Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
