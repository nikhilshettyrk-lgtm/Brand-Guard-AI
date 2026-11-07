import React from 'react';
import {
  LayoutDashboard,
  BookOpenCheck,
  ScanLine,
  CheckCheck,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useBrandGuard } from '../context/BrandGuardContext';

export default function Sidebar({ activePage, setActivePage, isCollapsed, setIsCollapsed }) {
  const { guidelines, metrics } = useBrandGuard();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'knowledge-hub',
      label: 'Brand Knowledge Hub',
      icon: BookOpenCheck,
      badge: guidelines.length > 0 ? `${guidelines.length}` : null
    },
    {
      id: 'content-review',
      label: 'Content Review',
      icon: ScanLine,
      badge: null
    },
    {
      id: 'review-approval',
      label: 'Review & Approval',
      icon: CheckCheck,
      badge: metrics.pendingCount > 0 ? `${metrics.pendingCount}` : null
    },
    {
      id: 'governance-insights',
      label: 'Governance Insights',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside
      className={`relative flex flex-col justify-between transition-all duration-300 ease-in-out bg-[#E8ECF3] border-r border-white/60 select-none z-30 ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
      style={{
        boxShadow: '4px 0 16px rgba(198, 206, 220, 0.4)'
      }}
    >
      {/* Top Branding Section */}
      <div>
        <div className="flex items-center justify-between px-5 py-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-[#E8ECF3] flex items-center justify-center neu-btn text-primary border border-white/80">
              <Shield className="w-6 h-6 stroke-[2.2] text-[#536DFE]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-[#202B45]">
                    Brand<span className="text-[#536DFE]">Guard</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#536DFE]/10 text-[#536DFE] border border-[#536DFE]/20">
                    AI
                  </span>
                </div>
                <span className="text-xs text-[#5E6E82] font-medium truncate">
                  Brand Governance
                </span>
              </div>
            )}
          </div>

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="neu-icon-btn !w-8 !h-8 hidden md:flex text-[#5E6E82] hover:text-[#202B45]"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-2">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-[#8A99AD]">
              Platform Navigation
            </div>
          )}

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full group relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'neu-active text-[#536DFE]'
                      : 'text-[#5E6E82] hover:text-[#202B45] hover:bg-white/40'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {/* Left indicator bar for active state */}
                  {isActive && (
                    <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-[#536DFE] shadow-[0_0_8px_rgba(83,109,254,0.6)]" />
                  )}

                  <div
                    className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-[#536DFE]' : 'text-[#5E6E82] group-hover:text-[#202B45]'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center justify-between flex-1 truncate text-left">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-[#536DFE] text-white shadow-sm'
                              : 'bg-[#D1D9E6] text-[#435478]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Hover tooltip when collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#202B45] text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Sidebar Card - Neutral Real System State */}
      <div className="p-3">
        {!isCollapsed ? (
          <div className="p-4 rounded-2xl bg-[#E8ECF3] neu-card-sm border border-white/80">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#536DFE]/10 flex items-center justify-center text-[#536DFE]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-[#202B45]">
                BrandGuard AI
              </span>
            </div>
            <p className="text-[11px] text-[#5E6E82] leading-relaxed mb-3">
              Platform initialized and ready for guideline ingestion.
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#5E6E82] font-semibold pt-1 border-t border-white/50">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                System Ready
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <span
              className="w-3 h-3 rounded-full bg-[#10B981]"
              title="System Ready"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
