import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Mountain, Satellite, Map as MapIcon, Moon, Crosshair, ZoomIn, ZoomOut, CheckCircle2 } from 'lucide-react';
import type { Device } from '../types.ts';

const MAPTILER_API_KEY = (import.meta as any).env?.VITE_MAPTILER_API_KEY || 'DBFLRU5qkLXqV5cEIEAw';

export type MapStyleType = 'hybrid' | 'dataviz-dark' | 'topo-v2' | 'streets-v2';

interface MapStyleOption {
  id: MapStyleType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getUrl: (key: string) => string;
  extension: 'jpg' | 'png';
  maxZoom: number;
}

const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'dataviz-dark',
    label: 'Dark Tactical',
    icon: Moon,
    getUrl: (key: string) => `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${key}`,
    extension: 'png',
    maxZoom: 20
  },
  {
    id: 'hybrid',
    label: 'Satellite Hybrid',
    icon: Satellite,
    getUrl: (key: string) => `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${key}`,
    extension: 'jpg',
    maxZoom: 20
  },
  {
    id: 'topo-v2',
    label: 'Topographic',
    icon: Mountain,
    getUrl: (key: string) => `https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=${key}`,
    extension: 'png',
    maxZoom: 20
  },
  {
    id: 'streets-v2',
    label: 'Streets',
    icon: MapIcon,
    getUrl: (key: string) => `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${key}`,
    extension: 'png',
    maxZoom: 20
  }
];

interface LeafletMapProps {
  devices: Device[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (deviceId: string) => void;
  height?: string;
  zoom?: number;
  initialStyle?: MapStyleType;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  height = '420px',
  zoom = 14,
  initialStyle = 'dataviz-dark'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const [activeStyle, setActiveStyle] = useState<MapStyleType>(initialStyle);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  // Initialize Map and handle tile layer switching
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center around mining coordinates
      const centerLat = devices.length > 0 ? devices[0].latitude : 10.7905;
      const centerLng = devices.length > 0 ? devices[0].longitude : 78.7047;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false, // Custom styled zoom controls
        attributionControl: false
      }).setView([centerLat, centerLng], zoom);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Swap tile layer with selected MapTiler style and API key
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const currentStyleConfig = MAP_STYLES.find(s => s.id === activeStyle) || MAP_STYLES[0];
    const tileUrl = currentStyleConfig.getUrl(MAPTILER_API_KEY);

    const newTileLayer = L.tileLayer(tileUrl, {
      maxZoom: currentStyleConfig.maxZoom,
      tileSize: 512,
      zoomOffset: -1,
      crossOrigin: true,
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap</a>'
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeStyle, zoom, devices]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m: any) => {
      if (m && typeof m.remove === 'function') {
        m.remove();
      }
    });
    markersRef.current = {};

    // Add markers for all devices
    const latLngs: L.LatLngExpression[] = [];

    devices.forEach(dev => {
      const isSelected = selectedDeviceId === dev.device_id;
      const isDanger = dev.current_risk_level === 'DANGER';
      const isWarning = dev.current_risk_level === 'WARNING';
      const isOffline = dev.status === 'OFFLINE';

      let bgClass = 'bg-emerald-600 border-emerald-400 text-white';
      let pulseClass = '';

      if (isOffline) {
        bgClass = 'bg-[#202227] border-[#353840] text-[#8E9299]';
      } else if (isDanger) {
        bgClass = 'bg-[#FF3B30] border-rose-300 text-white';
        pulseClass = 'marker-danger-pulse';
      } else if (isWarning) {
        bgClass = 'bg-[#F27D26] border-amber-200 text-black font-bold';
        pulseClass = 'marker-orange-pulse';
      }

      const iconHtml = `
        <div class="relative cursor-pointer transition-transform hover:scale-110">
          <div class="w-8 h-8 rounded border ${bgClass} ${pulseClass} shadow-md flex items-center justify-center font-bold text-[11px] font-mono">
            ${dev.device_id.replace('NODE-', '')}
          </div>
          ${isSelected ? `<div class="absolute -inset-1 rounded border-2 border-[#F27D26] animate-ping opacity-75"></div>` : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([dev.latitude, dev.longitude], { icon: customIcon }).addTo(map);

      const updateDateStr = formatReadableDate(dev.last_seen);
      const riskBadgeColor = isDanger
        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        : isWarning
        ? 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/40'
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

      const popupContent = `
        <div class="p-1 min-w-[210px] text-[#E4E7EB]">
          <div class="flex items-center justify-between gap-2 border-b border-[#26282e] pb-2 mb-2">
            <div>
              <div class="font-mono font-bold text-sm text-[#F27D26]">${dev.device_id}</div>
              <div class="text-[11px] text-[#8E9299] truncate max-w-[140px]">${dev.device_name}</div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${riskBadgeColor}">
              ${dev.current_risk_level || 'SAFE'}
            </span>
          </div>

          <div class="space-y-1 text-xs mb-2.5">
            <div class="flex justify-between text-[#8E9299]">
              <span class="text-[#8E9299]">Location:</span>
              <span class="font-medium text-[#E4E7EB] text-right truncate max-w-[120px]">${dev.installation_location}</span>
            </div>
            <div class="flex justify-between text-[#8E9299]">
              <span class="text-[#8E9299]">Coordinates:</span>
              <span class="font-mono text-[#E4E7EB]">${dev.latitude.toFixed(4)}, ${dev.longitude.toFixed(4)}</span>
            </div>
            <div class="flex justify-between text-[#8E9299]">
              <span class="text-[#8E9299]">Current Tilt:</span>
              <span class="font-mono font-semibold text-[#F27D26]">${(dev.current_tilt ?? 0).toFixed(2)}°</span>
            </div>
            <div class="flex justify-between text-[#8E9299]">
              <span class="text-[#8E9299]">Current Vibration:</span>
              <span class="font-mono font-semibold text-[#E4E7EB]">${(dev.current_vibration ?? 0).toFixed(2)} g</span>
            </div>
            <div class="flex justify-between text-[#8E9299]">
              <span class="text-[#8E9299]">Risk Score:</span>
              <span class="font-mono font-bold ${isDanger ? 'text-rose-400' : isWarning ? 'text-[#F27D26]' : 'text-emerald-400'}">${dev.current_risk_score ?? 0}/100</span>
            </div>
          </div>

          <div class="pt-2 border-t border-[#26282e] text-[10px] text-[#8E9299] flex items-center justify-between">
            <span>Last Packet:</span>
            <span class="font-mono text-[#E4E7EB]">${updateDateStr}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectDevice) onSelectDevice(dev.device_id);
      });

      markersRef.current[dev.device_id] = marker;
      latLngs.push([dev.latitude, dev.longitude]);
    });

    // Auto-fit if multiple
    if (latLngs.length > 1 && !selectedDeviceId) {
      try {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40] });
      } catch {
        // ignore bounds calculation error
      }
    } else if (selectedDeviceId && markersRef.current[selectedDeviceId]) {
      const selDev = devices.find(d => d.device_id === selectedDeviceId);
      if (selDev) {
        map.setView([selDev.latitude, selDev.longitude], 15);
        markersRef.current[selectedDeviceId].openPopup();
      }
    }
  }, [devices, selectedDeviceId, onSelectDevice]);

  // Recenter helper
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const latLngs = devices.map(d => [d.latitude, d.longitude] as [number, number]);
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div className="relative w-full rounded overflow-hidden border border-[#26282e] shadow-xl bg-[#0a0a0b] group">
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Top Left: Map Style Selector Toolbar */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 bg-[#0d0e11]/90 backdrop-blur-md p-1 rounded-lg border border-[#26282e] shadow-lg">
        {MAP_STYLES.map(style => {
          const Icon = style.icon;
          const isActive = activeStyle === style.id;
          return (
            <button
              key={style.id}
              onClick={() => setActiveStyle(style.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#F27D26] text-black font-bold shadow-sm'
                  : 'text-[#8E9299] hover:text-[#E4E7EB] hover:bg-[#18191d]'
              }`}
              title={style.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{style.label}</span>
            </button>
          );
        })}
      </div>

      {/* Top Right: Status Legend & MapTiler Indicator */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col sm:flex-row items-end sm:items-center gap-2">
        <div className="bg-[#0d0e11]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#26282e] text-[11px] font-mono text-[#E4E7EB] flex items-center gap-3 shadow-lg">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> SAFE
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F27D26]"></span> WARNING
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse"></span> DANGER
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 bg-[#0d0e11]/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-[#26282e] text-[10px] font-mono text-[#00D26A] shadow-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#00D26A]" />
          <span>MapTiler HD</span>
        </div>
      </div>

      {/* Bottom Right: Zoom & Center Controls */}
      <div className="absolute bottom-6 right-3 z-[400] flex flex-col gap-1.5 shadow-lg">
        <button
          onClick={handleRecenter}
          className="w-8 h-8 rounded-lg bg-[#0d0e11]/90 hover:bg-[#18191d] backdrop-blur-md border border-[#26282e] text-[#E4E7EB] hover:text-[#F27D26] flex items-center justify-center transition-colors cursor-pointer"
          title="Recenter all sensor nodes"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-lg bg-[#0d0e11]/90 hover:bg-[#18191d] backdrop-blur-md border border-[#26282e] text-[#E4E7EB] hover:text-[#F27D26] flex items-center justify-center transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-lg bg-[#0d0e11]/90 hover:bg-[#18191d] backdrop-blur-md border border-[#26282e] text-[#E4E7EB] hover:text-[#F27D26] flex items-center justify-center transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left: MapTiler Attribution */}
      <div className="absolute bottom-1 left-2 z-[400] text-[9px] font-mono text-[#8E9299]/80 bg-[#0d0e11]/80 backdrop-blur-xs px-2 py-0.5 rounded pointer-events-auto">
        <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer" className="hover:underline hover:text-[#E4E7EB]">
          © MapTiler
        </a>{' '}
        |{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:underline hover:text-[#E4E7EB]">
          © OpenStreetMap
        </a>
      </div>
    </div>
  );
};

function formatReadableDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}
