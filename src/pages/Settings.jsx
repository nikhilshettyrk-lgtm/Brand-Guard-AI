import React, { useState } from 'react';
import {
  Sliders,
  Bell,
  CheckCircle2,
  Save,
  RotateCcw
} from 'lucide-react';
import { useBrandGuard } from '../context/BrandGuardContext';

export default function Settings() {
  const { settings, updateSettings, clearAllData } = useBrandGuard();

  const [sensitivity, setSensitivity] = useState(settings.sensitivity || 90);
  const [autoApprove, setAutoApprove] = useState(settings.autoApprove || false);
  const [notifySlack, setNotifySlack] = useState(settings.notifySlack || false);
  const [slackChannel, setSlackChannel] = useState(settings.slackChannel || '');
  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail || false);
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSave = () => {
    updateSettings({
      sensitivity,
      autoApprove,
      notifySlack,
      slackChannel,
      notifyEmail,
      adminEmail
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    if (window.confirm('Reset all workspace records to empty state?')) {
      clearAllData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-7 max-w-5xl mx-auto pb-12">
      {/* Banner */}
      <div className="neu-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
              System Configuration
            </span>
            <span className="text-xs text-[#8A99AD] font-medium">Policy Settings</span>
          </div>
          <h2 className="text-2xl font-bold text-[#202B45]">
            Platform & Governance Settings
          </h2>
          <p className="text-xs md:text-sm text-[#5E6E82] font-medium mt-1">
            Manage automated tolerances, AI sensitivity benchmarks, and notification routes.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="neu-btn-primary px-5 py-2.5 text-xs md:text-sm font-bold flex items-center gap-2 self-start md:self-auto"
        >
          <Save className="w-4 h-4" />
          Save Preferences
        </button>
      </div>

      {savedSuccess && (
        <div className="neu-card-sm p-4 bg-[#10B981]/15 text-[#065F46] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          Settings updated successfully.
        </div>
      )}

      {resetSuccess && (
        <div className="neu-card-sm p-4 bg-[#536DFE]/15 text-[#536DFE] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <RotateCcw className="w-4 h-4 text-[#536DFE]" />
          All workspace records reset to initial zero state.
        </div>
      )}

      {/* Section 1: AI Rule Sensitivity */}
      <div className="neu-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#536DFE]/10 text-[#536DFE] flex items-center justify-center neu-btn">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#202B45]">AI Governance Sensitivity Threshold</h3>
            <p className="text-xs text-[#5E6E82]">
              Set the minimum composite compliance score required for automated approval.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/40 border border-white/60 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#202B45]">Minimum Approval Benchmark:</span>
            <span className="text-lg font-extrabold text-[#536DFE]">{sensitivity}%</span>
          </div>

          <input
            type="range"
            min={70}
            max={98}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="w-full h-2 bg-[#D1D9E6] rounded-lg appearance-none cursor-pointer accent-[#536DFE]"
          />

          <div className="flex justify-between text-[11px] text-[#8A99AD] font-semibold">
            <span>70% (Permissive / Advisory)</span>
            <span>85% (Standard Baseline)</span>
            <span>95%+ (Strict High Fidelity)</span>
          </div>
        </div>

        {/* Auto Approve Toggle */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs font-bold text-[#202B45]">Autonomous Clearance</p>
            <p className="text-xs text-[#5E6E82]">
              Automatically approve assets exceeding the sensitivity threshold without manual sign-off.
            </p>
          </div>
          <button
            onClick={() => setAutoApprove(!autoApprove)}
            className={`w-12 h-6 rounded-full transition-colors relative neu-input p-0.5 ${
              autoApprove ? 'bg-[#536DFE]' : 'bg-[#D1D9E6]'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                autoApprove ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Section 2: Alert Channels */}
      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#536DFE]/10 text-[#536DFE] flex items-center justify-center neu-btn">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#202B45]">Notification Channels</h3>
            <p className="text-xs text-[#5E6E82]">
              Configure where real-time violation alerts and sign-off requests are routed.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl neu-card-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#202B45]">Slack Governance Webhook</p>
                <p className="text-[11px] text-[#5E6E82]">Route violation alerts to a designated Slack channel.</p>
              </div>
              <button
                onClick={() => setNotifySlack(!notifySlack)}
                className={`w-11 h-6 rounded-full transition-colors relative neu-input p-0.5 ${
                  notifySlack ? 'bg-[#536DFE]' : 'bg-[#D1D9E6]'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    notifySlack ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {notifySlack && (
              <input
                type="text"
                placeholder="#channel-name or webhook URL"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="neu-input w-full px-3 py-1.5 text-xs font-mono"
              />
            )}
          </div>

          <div className="p-3.5 rounded-xl neu-card-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#202B45]">Email Digest</p>
                <p className="text-[11px] text-[#5E6E82]">Receive periodic summaries of organization compliance.</p>
              </div>
              <button
                onClick={() => setNotifyEmail(!notifyEmail)}
                className={`w-11 h-6 rounded-full transition-colors relative neu-input p-0.5 ${
                  notifyEmail ? 'bg-[#536DFE]' : 'bg-[#D1D9E6]'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    notifyEmail ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {notifyEmail && (
              <input
                type="email"
                placeholder="administrator@company.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="neu-input w-full px-3 py-1.5 text-xs"
              />
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Data Management */}
      <div className="neu-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#202B45]">Workspace Records Management</h3>
          <p className="text-xs text-[#5E6E82]">
            Clear all stored reviews, guidelines, and activity records to restore a blank workspace.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="neu-btn px-4 py-2 text-xs font-bold text-[#EF4444] hover:bg-red-50 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Stored Data
        </button>
      </div>
    </div>
  );
}
