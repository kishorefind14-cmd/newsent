import React from 'react';
import {
  LayoutDashboard,
  Activity,
  HardDrive,
  MapPin,
  History,
  BrainCircuit,
  Bell,
  Bot,
  FileText,
  Layers,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'live'
  | 'devices'
  | 'map'
  | 'history'
  | 'risk'
  | 'alerts'
  | 'assistant'
  | 'reports'
  | 'architecture'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  dangerCount: number;
  unreadAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  dangerCount,
  unreadAlertsCount
}) => {
  const navItems: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Activity },
    { id: 'devices', label: 'Devices', icon: HardDrive },
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'history', label: 'Historical Analysis', icon: History },
    {
      id: 'risk',
      label: 'AI Risk Prediction',
      icon: BrainCircuit,
      badge: dangerCount > 0 ? `${dangerCount} DANGER` : undefined,
      badgeColor: 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/40'
    },
    {
      id: 'alerts',
      label: 'Alerts & SMS',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
      badgeColor: 'bg-[#F27D26]/20 text-[#F27D26] border-[#F27D26]/40'
    },
    { id: 'assistant', label: 'Sentinal AI', icon: Bot },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'architecture', label: 'Architecture & ESP32', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#0d0e11] border-r border-[#26282e] flex flex-col justify-between py-4 px-3 min-h-[calc(100vh-61px)]">
      {/* Navigation Links */}
      <div className="space-y-1">
        <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#8E9299] font-bold">
          SYSTEM CONSOLE
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono transition-all ${
                isActive
                  ? 'bg-[#F27D26]/15 text-[#F27D26] border border-[#F27D26]/40 font-bold shadow-sm'
                  : 'text-[#8E9299] hover:text-[#E4E7EB] hover:bg-[#151619] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#F27D26]' : 'text-[#8E9299]'}`} />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Session card at bottom */}
      <div className="pt-3 border-t border-[#26282e] space-y-2">
        <div className="p-2 rounded bg-[#151619] border border-[#26282e] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#202227] border border-[#26282e] flex items-center justify-center font-bold text-[11px] text-[#F27D26] font-mono">
            OP
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-[#E4E7EB] truncate">Chief Geotech Engineer</div>
            <div className="text-[10px] text-[#8E9299] font-mono truncate">ID: CH-ADMIN-882</div>
          </div>
        </div>

        <button
          onClick={() => alert('Mine Sentinel operator session locked. Credentials verified.')}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-[#8E9299] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors font-mono"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Operator Lock</span>
        </button>
      </div>
    </aside>
  );
};
