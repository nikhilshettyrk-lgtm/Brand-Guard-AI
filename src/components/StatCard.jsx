import React from 'react';
import {
  Files,
  ShieldCheck,
  ClockAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Minus
} from 'lucide-react';

const iconMap = {
  Files: Files,
  ShieldCheck: ShieldCheck,
  ClockAlert: ClockAlert,
  AlertTriangle: AlertTriangle
};

export default function StatCard({ card, onClick }) {
  const IconComponent = iconMap[card.icon] || Files;

  return (
    <div
      onClick={onClick}
      className="neu-card p-5 cursor-pointer group hover:-translate-y-1 transition-all duration-200 relative overflow-hidden flex flex-col justify-between"
    >
      {/* Top row: Icon & Status / Trend */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
          style={{
            background: '#E8ECF3',
            boxShadow: '4px 4px 8px #cad1de, -4px -4px 8px #ffffff',
            border: '1px solid rgba(255, 255, 255, 0.8)'
          }}
        >
          <IconComponent
            className="w-6 h-6 stroke-[2]"
            style={{ color: card.accentColor }}
          />
        </div>

        {/* Status / Trend Indicator Pill */}
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
            card.trendType === 'neutral'
              ? 'bg-[#8A99AD]/15 text-[#5E6E82]'
              : card.trendType === 'positive'
              ? 'bg-[#10B981]/15 text-[#047857]'
              : card.trendType === 'warning'
              ? 'bg-[#F59E0B]/15 text-[#B45309]'
              : card.trendType === 'danger'
              ? 'bg-[#EF4444]/15 text-[#B91C1C]'
              : 'bg-white/60 text-[#8A99AD]'
          }`}
        >
          {card.trendType === 'positive' && <TrendingUp className="w-3.5 h-3.5" />}
          {card.trendType === 'danger' && <TrendingDown className="w-3.5 h-3.5" />}
          {card.trendType === 'neutral' && <Minus className="w-3 h-3" />}
          <span>{card.statusBadge || '0 records'}</span>
        </div>
      </div>

      {/* Metric details */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5E6E82] mb-1">
          {card.title}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#202B45] tracking-tight">
            {card.value}
          </span>
          {card.unit && (
            <span className="text-xs font-medium text-[#5E6E82]">
              {card.unit}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Subtitle / Micro-indicator */}
      <div className="mt-3 pt-3 border-t border-[#D5DDE7]/70 flex items-center justify-between text-xs text-[#8A99AD]">
        <span className="font-medium truncate">{card.timeframe}</span>
        <ArrowRight className="w-3.5 h-3.5 text-[#536DFE] opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0" />
      </div>
    </div>
  );
}
