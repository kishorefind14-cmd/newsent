import React from 'react';
import { ShieldAlert, Radio, Bell, RefreshCw, Cpu, Activity } from 'lucide-react';
import type { SystemStats } from '../types.ts';

interface NavbarProps {
  stats: SystemStats | null;
  simulatorActive: boolean;
  onToggleSimulatorModal: () => void;
  onRefreshData: () => void;
  activeAlertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  simulatorActive,
  onToggleSimulatorModal,
  onRefreshData,
  activeAlertCount
}) => {
  const lastTime = stats?.last_data_received ? formatTime(stats.last_data_received) : 'Connecting...';

  return (
    <header className="bg-[#0d0e11]/95 backdrop-blur-md border-b border-[#26282e] sticky top-0 z-30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-[#F27D26] flex items-center justify-center text-black font-bold shadow-md shadow-[#F27D26]/20">
          <ShieldAlert className="w-5 h-5 text-black stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-wider text-[#E4E7EB] uppercase font-mono-tech flex items-center gap-2">
              MINE SENTINEL
            </h1>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#18191d] text-[#F27D26] border border-[#26282e] font-bold">
              SYS::v2.4 IoT ML
            </span>
          </div>
          <p className="text-xs text-[#8E9299] font-medium tracking-tight">
            AI-Enabled Mine Subsidence Monitoring & Early Warning System
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#00D26A]/10 border border-[#00D26A]/30 text-[#00D26A] text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D26A] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D26A]"></span>
          </span>
          <span className="font-bold tracking-wider text-[11px]">TELEMETRY LIVE</span>
        </div>

        {/* Demo Mode Badge */}
        {simulatorActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F27D26]/10 border border-[#F27D26]/30 text-[#F27D26] text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 text-[#F27D26]" />
            <span className="font-bold text-[11px]">SIMULATOR ACTIVE</span>
          </div>
        )}

        {/* Last Data Received */}
        <div className="hidden md:flex flex-col text-right pr-1">
          <span className="text-[9px] uppercase text-[#8E9299] font-mono tracking-wider">Last Packet</span>
          <span className="text-xs font-mono text-[#E4E7EB] font-semibold">{lastTime}</span>
        </div>

        {/* Simulator Control Button */}
        <button
          onClick={onToggleSimulatorModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#151619] hover:bg-[#1c1e22] hover:border-[#F27D26]/60 border border-[#26282e] text-[#E4E7EB] text-xs font-mono transition-all shadow-sm"
          title="Hardware Simulator & Testing"
        >
          <Radio className={`w-3.5 h-3.5 ${simulatorActive ? 'text-[#F27D26] animate-pulse' : 'text-[#8E9299]'}`} />
          <span className="hidden sm:inline">Hardware Test Rack</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefreshData}
          className="p-1.5 rounded bg-[#151619] hover:bg-[#1c1e22] hover:border-[#F27D26]/60 border border-[#26282e] text-[#8E9299] hover:text-[#E4E7EB] transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return iso;
  }
}
