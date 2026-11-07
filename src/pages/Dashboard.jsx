import React, { useState } from 'react';
import {
  UploadCloud,
  FileCheck,
  ClockAlert,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import StatCard from '../components/StatCard';
import { useBrandGuard } from '../context/BrandGuardContext';

// Custom Recharts Neumorphic Tooltip for real data
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="neu-card-sm p-3 bg-[#E8ECF3] border border-white text-xs shadow-lg">
        <p className="font-bold text-[#202B45] mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#536DFE]" />
          <span className="text-[#5E6E82]">Compliance Score:</span>
          <span className="font-extrabold text-[#202B45]">{payload[0].value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard({ onNavigate, onTriggerQuickAction }) {
  const { metrics, violationCategories, activities, reviews } = useBrandGuard();
  const [activityFilter, setActivityFilter] = useState('All');

  // Real 4 Stat Cards calculated from actual data records
  const statCards = [
    {
      id: 'total-reviewed',
      title: 'Total Content Reviewed',
      value: metrics.totalReviewed,
      unit: metrics.totalReviewed === 1 ? 'asset' : 'assets',
      statusBadge: metrics.totalReviewed > 0 ? `${metrics.totalReviewed} recorded` : '0 records',
      trendType: metrics.totalReviewed > 0 ? 'positive' : 'neutral',
      timeframe: metrics.totalReviewed > 0 ? 'From recorded analyses' : 'No records logged',
      icon: 'Files',
      accentColor: '#536DFE'
    },
    {
      id: 'approved-content',
      title: 'Approved Content',
      value: metrics.approvedCount,
      unit: metrics.totalReviewed > 0 ? `${metrics.approvalRate}% rate` : '0% rate',
      statusBadge: metrics.approvedCount > 0 ? `${metrics.approvedCount} passed` : '0 passed',
      trendType: metrics.approvedCount > 0 ? 'positive' : 'neutral',
      timeframe: metrics.approvedCount > 0 ? 'Verified compliant' : 'No approvals yet',
      icon: 'ShieldCheck',
      accentColor: '#10B981'
    },
    {
      id: 'pending-reviews',
      title: 'Pending Reviews',
      value: metrics.pendingCount,
      unit: 'in queue',
      statusBadge: metrics.pendingCount > 0 ? `${metrics.pendingCount} awaiting` : '0 pending',
      trendType: metrics.pendingCount > 0 ? 'warning' : 'neutral',
      timeframe: metrics.pendingCount > 0 ? 'Requires sign-off' : 'Queue is empty',
      icon: 'ClockAlert',
      accentColor: '#F59E0B'
    },
    {
      id: 'critical-violations',
      title: 'Critical Violations',
      value: metrics.criticalViolations,
      unit: metrics.criticalViolations === 1 ? 'issue' : 'issues',
      statusBadge: metrics.criticalViolations > 0 ? `${metrics.criticalViolations} flagged` : '0 flagged',
      trendType: metrics.criticalViolations > 0 ? 'danger' : 'neutral',
      timeframe: metrics.criticalViolations > 0 ? 'Needs resolution' : 'Zero violations',
      icon: 'AlertTriangle',
      accentColor: '#EF4444'
    }
  ];

  // Derive real chart data from reviews if any exist
  const realChartData = reviews
    .filter((r) => typeof r.score === 'number')
    .map((r, i) => ({
      index: `#${i + 1}`,
      name: r.title.length > 12 ? `${r.title.substring(0, 12)}...` : r.title,
      score: r.score
    }));

  const filteredActivities = activities.filter((item) => {
    if (activityFilter === 'All') return true;
    if (activityFilter === 'Under Review') {
      return item.status === 'Pending Review' || item.status === 'Pending' || item.status === 'Under Review';
    }
    return item.status === activityFilter;
  });

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Welcome & Quick Actions Bar */}
      <div className="neu-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
              BrandGuard AI
            </span>
            <span className="text-xs text-[#5E6E82] font-semibold">
              Governance Workspace
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#202B45] tracking-tight">
            Brand Governance Dashboard
          </h2>
          <p className="text-sm text-[#5E6E82] mt-1 max-w-2xl font-medium">
            Monitor real-time brand identity adherence, content approvals, and governance records.
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => onTriggerQuickAction('upload-guidelines')}
            className="neu-btn px-4 py-2.5 text-xs md:text-sm font-bold text-[#202B45] flex items-center gap-2 hover:text-[#536DFE]"
          >
            <UploadCloud className="w-4 h-4 text-[#536DFE]" />
            Upload Brand Guidelines
          </button>

          <button
            onClick={() => onTriggerQuickAction('review-content')}
            className="neu-btn-primary px-4 py-2.5 text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm"
          >
            <FileCheck className="w-4 h-4" />
            Review New Content
          </button>

          <button
            onClick={() => onNavigate('review-approval')}
            className="neu-btn px-4 py-2.5 text-xs md:text-sm font-bold text-[#202B45] flex items-center gap-2 hover:text-[#536DFE]"
          >
            <ClockAlert className="w-4 h-4 text-[#F59E0B]" />
            Pending Approvals ({metrics.pendingCount})
          </button>
        </div>
      </div>

      {/* 4 Statistic Cards (Actual Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <StatCard
            key={card.id}
            card={card}
            onClick={() => {
              if (card.id === 'pending-reviews') onNavigate('review-approval');
              else if (card.id === 'critical-violations') onNavigate('content-review');
              else if (card.id === 'total-reviewed') onNavigate('content-review');
              else onNavigate('governance-insights');
            }}
          />
        ))}
      </div>

      {/* Analytics Section: 2 Charts with Meaningful Empty States */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Brand Compliance Score Trend (2 Columns) */}
        <div className="lg:col-span-2 neu-card p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#202B45]">
                  Brand Compliance Score
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
                  {metrics.averageScore !== null ? `${metrics.averageScore}% Average` : '0%'}
                </span>
              </div>
              <p className="text-xs text-[#5E6E82] font-medium mt-0.5">
                Composite compliance index measured from completed content reviews
              </p>
            </div>
          </div>

          {/* Real Chart or Meaningful Empty State */}
          {realChartData.length > 0 ? (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={realChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#536DFE" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#536DFE" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1D9E6" />
                  <XAxis dataKey="name" stroke="#8A99AD" fontSize={11} tickLine={false} axisLine={{ stroke: '#D1D9E6' }} />
                  <YAxis domain={[0, 100]} stroke="#8A99AD" fontSize={11} tickLine={false} axisLine={{ stroke: '#D1D9E6' }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="#536DFE" strokeWidth={3} fillOpacity={1} fill="url(#scoreGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="min-h-[220px] rounded-2xl bg-[#E8ECF3] neu-input flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#536DFE] mb-3">
                <LineChartIcon className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#202B45]">
                No compliance data available yet
              </h4>
              <p className="text-xs text-[#5E6E82] max-w-sm mt-1 mb-4">
                Submit content for your first analysis to generate real-time compliance trends.
              </p>
              <button
                onClick={() => onTriggerQuickAction('review-content')}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#536DFE] flex items-center gap-1.5"
              >
                <FileCheck className="w-3.5 h-3.5" />
                Review Content Now
              </button>
            </div>
          )}

          {/* Chart Footnote Highlights (Real Values) */}
          <div className="mt-4 pt-4 border-t border-[#D5DDE7]/70 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[11px] font-semibold text-[#8A99AD] uppercase">Target Standard</p>
              <p className="text-sm font-bold text-[#202B45]">85.0% Min</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8A99AD] uppercase">Average Score</p>
              <p className="text-sm font-bold text-[#202B45]">
                {metrics.averageScore !== null ? `${metrics.averageScore}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8A99AD] uppercase">Scanned Volume</p>
              <p className="text-sm font-bold text-[#536DFE]">
                {metrics.totalReviewed} {metrics.totalReviewed === 1 ? 'Asset' : 'Assets'}
              </p>
            </div>
          </div>
        </div>

        {/* Chart 2: Violation Distribution (1 Column) */}
        <div className="neu-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-[#202B45]">
                Violation Distribution
              </h3>
              <span className="text-xs font-semibold text-[#8A99AD]">
                {metrics.criticalViolations} {metrics.criticalViolations === 1 ? 'Issue' : 'Issues'}
              </span>
            </div>
            <p className="text-xs text-[#5E6E82] font-medium mb-4">
              Breakdown by automated guideline failure category
            </p>

            {/* Real Donut Chart or Meaningful Empty State */}
            {violationCategories.length > 0 ? (
              <div className="h-48 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={violationCategories}
                      innerRadius={52}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {violationCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-extrabold text-[#202B45]">{metrics.criticalViolations}</span>
                  <span className="text-[10px] font-bold text-[#8A99AD] uppercase">Flags</span>
                </div>
              </div>
            ) : (
              <div className="min-h-[190px] rounded-2xl bg-[#E8ECF3] neu-input flex flex-col items-center justify-center p-5 text-center">
                <div className="w-10 h-10 rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#10B981] mb-2">
                  <PieChartIcon className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-[#202B45]">
                  No violations recorded
                </h4>
                <p className="text-[11px] text-[#5E6E82] mt-1">
                  Violations identified during asset reviews will be categorized here.
                </p>
              </div>
            )}
          </div>

          {/* Category List */}
          {violationCategories.length > 0 && (
            <div className="space-y-2 mt-2">
              {violationCategories.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-semibold text-[#202B45] truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <span className="font-bold text-[#202B45]">{cat.count}</span>
                    <span className="text-[11px] font-medium text-[#8A99AD] w-7 text-right">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity List (Actual Records or Clean Empty State) */}
      <div className="neu-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#202B45]">
                Recent Audit & Review Stream
              </h3>
            </div>
            <p className="text-xs text-[#5E6E82] font-medium mt-0.5">
              Live records of assets processed and reviewed within this workspace
            </p>
          </div>

          {/* Activity Filter Buttons */}
          {activities.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {['All', 'Approved', 'Under Review', 'Changes Requested', 'Rejected', 'Flagged'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActivityFilter(filter)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                    activityFilter === filter
                      ? 'neu-active text-[#536DFE]'
                      : 'neu-btn text-[#5E6E82] hover:text-[#202B45]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row list or Empty State */}
        {activities.length === 0 ? (
          <div className="py-12 px-4 rounded-2xl bg-[#E8ECF3] neu-input flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#8A99AD] mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#202B45]">
              No recent activity recorded
            </h4>
            <p className="text-xs text-[#5E6E82] max-w-sm mt-1 mb-5">
              The activity stream will track content reviews, approvals, and guideline updates as they occur.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onTriggerQuickAction('review-content')}
                className="neu-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <FileCheck className="w-3.5 h-3.5" />
                Review First Asset
              </button>
              <button
                onClick={() => onTriggerQuickAction('upload-guidelines')}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#202B45] flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#536DFE]" />
                Upload Guidelines
              </button>
            </div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8A99AD]">
            No activity matches filter "{activityFilter}".
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-2xl bg-[#E8ECF3] neu-card-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all group"
              >
                {/* Left: Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      act.status === 'Approved'
                        ? 'bg-[#10B981]/15 text-[#10B981]'
                        : act.status === 'Flagged' || act.status === 'Rejected'
                        ? 'bg-[#EF4444]/15 text-[#EF4444]'
                        : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                    }`}
                  >
                    {act.status === 'Approved' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : act.status === 'Flagged' || act.status === 'Rejected' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[#202B45] group-hover:text-[#536DFE] transition-colors truncate">
                        {act.title}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/70 text-[#5E6E82] border border-[#D1D9E6]">
                        {act.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#8A99AD] mt-1 flex-wrap">
                      <span className="font-medium text-[#5E6E82]">{act.department}</span>
                      <span>•</span>
                      <span>By {act.submittedBy}</span>
                      <span>•</span>
                      <span>{act.timestamp}</span>
                    </div>

                    {act.issue && (
                      <p className="text-xs text-[#B91C1C] font-semibold mt-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {act.issue}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Score & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-white/50">
                  <div className="text-right">
                    <span className="text-xs text-[#8A99AD] font-semibold block">
                      Score
                    </span>
                    <span
                      className={`text-base font-extrabold ${
                        act.score >= 90
                          ? 'text-[#10B981]'
                          : act.score >= 80
                          ? 'text-[#F59E0B]'
                          : 'text-[#EF4444]'
                      }`}
                    >
                      {act.score}%
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      act.status === 'Approved'
                        ? 'bg-[#10B981]/15 text-[#047857]'
                        : act.status === 'Flagged' || act.status === 'Rejected'
                        ? 'bg-[#EF4444]/15 text-[#B91C1C]'
                        : 'bg-[#F59E0B]/15 text-[#B45309]'
                    }`}
                  >
                    {act.status}
                  </span>

                  <button
                    onClick={() => onNavigate('content-review')}
                    className="neu-btn px-3 py-1.5 text-xs font-bold text-[#202B45] flex items-center gap-1 hover:text-[#536DFE]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
