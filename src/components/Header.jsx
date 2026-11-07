import React, { useState } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Building2,
  CheckCircle2,
  AlertTriangle,
  X,
  User,
  Inbox
} from 'lucide-react';
import { useBrandGuard } from '../context/BrandGuardContext';

export default function Header({
  activePage,
  pageTitles,
  onOpenQuickAction,
  onSearchChange,
  searchQuery
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { notifications, clearAllData, selectedOrganisation, setSelectedOrganisation, organisations } = useBrandGuard();

  const currentTitle = pageTitles[activePage] || {
    title: 'BrandGuard AI',
    subtitle: 'Brand Governance Platform'
  };

  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 px-6 md:px-8 py-5 bg-[#E8ECF3] border-b border-white/60">
      {/* Page Title & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8A99AD] mb-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 neu-card-sm px-2.5 py-1 bg-white/60 border border-white/80 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-[#536DFE]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A99AD]">Organisation:</span>
            <select
              value={selectedOrganisation}
              onChange={(e) => setSelectedOrganisation(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#202B45] cursor-pointer focus:outline-none"
            >
              {(organisations || ['BrightWave Analytics', 'Northstar Digital']).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <span>/</span>
          <span className="text-[#536DFE] font-bold">{currentTitle.title}</span>
        </div>
        <h1 className="text-2xl md:text-[26px] font-bold text-[#202B45] tracking-tight">
          {currentTitle.title}
        </h1>
        <p className="text-xs md:text-sm text-[#5E6E82] font-medium mt-0.5">
          {currentTitle.subtitle}
        </p>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center flex-wrap gap-3.5">
        {/* Inset Neumorphic Search Bar */}
        <div className="relative w-64 md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A99AD]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search guidelines, rules, assets..."
            className="neu-input w-full pl-10 pr-12 py-2.5 text-xs md:text-sm placeholder-[#8A99AD] text-[#202B45] font-medium"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-[#8A99AD] bg-white/70 rounded border border-[#C6CEDC] shadow-xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Notification Icon Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="neu-icon-btn relative text-[#5E6E82] hover:text-[#202B45]"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-[#E8ECF3]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-2xl bg-[#E8ECF3] neu-card p-4 z-50 border border-white/80 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#D1D9E6]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#202B45]">Notifications</span>
                  {notifications.length > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444]">
                      {notifications.length} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[#8A99AD] hover:text-[#202B45]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-white/60 neu-card-sm flex items-center justify-center text-[#8A99AD] mb-2">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[#202B45]">No notifications</p>
                  <p className="text-[11px] text-[#5E6E82] mt-0.5">
                    You're all caught up. Alerts and review notifications will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#D1D9E6]/50 mt-2 max-h-72 overflow-y-auto pr-1">
                  {notifications.map((n) => (
                    <div key={n.id} className="py-2.5 flex items-start gap-3 hover:bg-white/30 rounded-xl px-2 transition-colors">
                      <div className="mt-0.5">
                        {n.type === 'critical' ? (
                          <div className="w-7 h-7 rounded-lg bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-[#536DFE]/15 text-[#536DFE] flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#202B45] truncate">{n.title}</p>
                        <p className="text-[11px] text-[#5E6E82] line-clamp-1">{n.desc}</p>
                        <span className="text-[10px] text-[#8A99AD] font-medium">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile & Organisation Info (Neutral Real Values) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="neu-btn px-3 py-1.5 flex items-center gap-3 text-left focus:outline-none"
          >
            {/* User Avatar with Status indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#536DFE] to-[#7288FF] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                WA
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981] ring-2 ring-[#E8ECF3]" />
            </div>

            {/* User & Org Details */}
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-[#202B45] leading-tight">
                Workspace Administrator
              </div>
              <div className="text-[10px] font-semibold text-[#5E6E82]">
                {selectedOrganisation || 'My Workspace'}
              </div>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-[#8A99AD]" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#E8ECF3] neu-card p-3 z-50 border border-white/80 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2 border-b border-[#D1D9E6]">
                <p className="text-xs font-bold text-[#202B45]">Workspace Administrator</p>
                <p className="text-[11px] text-[#5E6E82]">{selectedOrganisation || 'My Workspace'}</p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#536DFE]/15 text-[#536DFE]">
                  BrandGuard AI
                </span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-[#202B45] hover:bg-white/40 rounded-xl"
                >
                  Workspace Preferences
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    clearAllData();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-[#EF4444] hover:bg-red-50/50 rounded-xl"
                >
                  Reset Workspace Records
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
