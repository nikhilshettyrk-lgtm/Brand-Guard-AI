import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Building,
  Building2,
  Globe,
  Clock,
  ShieldAlert,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Filter,
  ArrowUpRight,
  Check,
  X,
  Layers,
  ShieldCheck,
  HelpCircle,
  RefreshCw,
  Calendar,
  ChevronDown,
  SlidersHorizontal,
  Eye,
  UserCheck,
  Printer,
  Download,
  Palette,
  Activity,
  HeartPulse,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import BrandHealthGauge from '../components/BrandHealthGauge';
import {
  calculateBrandHealth,
  calculateVisualVsTextAnalytics,
  calculateMonthlyCohorts
} from '../utils/complianceAnalytics';
import { useBrandGuard } from '../context/BrandGuardContext';

// Custom Tooltip for Recharts Neumorphic Style
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="neu-card-sm p-3 bg-[#E8ECF3] border border-white text-xs shadow-lg">
        <p className="font-bold text-[#202B45] mb-1.5">{label || payload[0]?.name}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px] my-0.5">
            <span className="flex items-center gap-1.5 text-[#5E6E82]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name}:
            </span>
            <span className="font-bold text-[#202B45]">
              {entry.value}{entry.unit || ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Robust Organization Matcher
function matchesOrganisation(itemOrg, targetOrg) {
  if (!itemOrg || !targetOrg) return false;
  const normItem = itemOrg.toLowerCase().trim();
  const normTarget = targetOrg.toLowerCase().trim();
  if (normItem === normTarget) return true;
  return normItem.includes(normTarget) || normTarget.includes(normItem);
}

export default function GovernanceInsights() {
  const {
    reviews,
    uploadedDocuments,
    manualGuidelines,
    selectedOrganisation,
    setSelectedOrganisation
  } = useBrandGuard();

  // 1. EXTRACT ALL DISTINCT ORGANISATIONS IN APPLICATION
  const availableOrganisations = useMemo(() => {
    const orgsSet = new Set();
    reviews.forEach(r => {
      if (r.organisationId) orgsSet.add(r.organisationId.trim());
      if (r.organisation) orgsSet.add(r.organisation.trim());
    });
    uploadedDocuments.forEach(d => {
      if (d.organisation) orgsSet.add(d.organisation.trim());
    });
    manualGuidelines.forEach(g => {
      if (g.organisation) orgsSet.add(g.organisation.trim());
    });

    const arr = Array.from(orgsSet).filter(Boolean);
    if (arr.length === 0) return ['Salesforce'];
    return arr;
  }, [reviews, uploadedDocuments, manualGuidelines]);

  // Active Organisation State
  const activeOrg = availableOrganisations.includes(selectedOrganisation)
    ? selectedOrganisation
    : availableOrganisations[0] || 'Salesforce';

  // 2. ISOLATE DATA EXCLUSIVELY TO CURRENT ORGANISATION
  const orgReviews = useMemo(() => {
    return reviews.filter(r => {
      const org = r.organisationId || r.organisation || 'Salesforce';
      return matchesOrganisation(org, activeOrg);
    });
  }, [reviews, activeOrg]);

  // 3. FILTER & REPORT MODAL STATES
  const [dateRange, setDateRange] = useState('all'); // 'all' | '7d' | '30d' | '90d'
  const [selectedContentType, setSelectedContentType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);

  // Dynamic filter options from actual organisation records
  const contentTypes = useMemo(() => {
    const set = new Set();
    orgReviews.forEach(r => {
      if (r.contentType) set.add(r.contentType);
      else if (r.type) set.add(r.type);
    });
    return Array.from(set);
  }, [orgReviews]);

  const violationCategoriesList = useMemo(() => {
    const set = new Set();
    orgReviews.forEach(r => {
      const list = r.violations || r.findings || [];
      list.forEach(v => {
        if (v.category) set.add(v.category);
      });
    });
    return Array.from(set);
  }, [orgReviews]);

  // Check if any filter is active
  const isFilterActive = dateRange !== 'all' ||
    selectedContentType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedSeverity !== 'all' ||
    selectedStatus !== 'all';

  const resetFilters = () => {
    setDateRange('all');
    setSelectedContentType('all');
    setSelectedCategory('all');
    setSelectedSeverity('all');
    setSelectedStatus('all');
  };

  // 4. APPLY USER FILTERS TO ISOLATED ORGANISATION DATA
  const filteredReviews = useMemo(() => {
    const now = Date.now();
    return orgReviews.filter(r => {
      // Date Range Filter
      if (dateRange !== 'all') {
        const reviewDate = r.timestamp && !isNaN(new Date(r.timestamp))
          ? new Date(r.timestamp).getTime()
          : (r.versions?.[0]?.timestamp && !isNaN(new Date(r.versions[0].timestamp))
              ? new Date(r.versions[0].timestamp).getTime()
              : null);

        if (reviewDate) {
          const diffDays = (now - reviewDate) / (1000 * 60 * 60 * 24);
          if (dateRange === '7d' && diffDays > 7) return false;
          if (dateRange === '30d' && diffDays > 30) return false;
          if (dateRange === '90d' && diffDays > 90) return false;
        }
      }

      // Content Type Filter
      if (selectedContentType !== 'all') {
        const cType = r.contentType || r.type || 'General';
        if (cType !== selectedContentType) return false;
      }

      // Review Status Filter
      if (selectedStatus !== 'all') {
        if (r.status !== selectedStatus) return false;
      }

      // Violation Category Filter
      if (selectedCategory !== 'all') {
        const list = r.violations || r.findings || [];
        const hasCategory = list.some(v => v.category === selectedCategory);
        if (!hasCategory) return false;
      }

      // Severity Filter
      if (selectedSeverity !== 'all') {
        const list = r.violations || r.findings || [];
        const hasSeverity = list.some(v => (v.severity || v.priority) === selectedSeverity);
        if (!hasSeverity) return false;
      }

      return true;
    });
  }, [orgReviews, dateRange, selectedContentType, selectedCategory, selectedSeverity, selectedStatus]);

  // 5. CALCULATE OVERVIEW METRICS ACCURATELY USING VERSION HISTORY
  const metricsData = useMemo(() => {
    const totalReviews = filteredReviews.length;
    const scoredReviews = filteredReviews.filter(r => typeof r.score === 'number');
    const averageScore = scoredReviews.length > 0
      ? Math.round(scoredReviews.reduce((sum, r) => sum + r.score, 0) / scoredReviews.length)
      : 0;

    let totalViolationsDetected = 0;
    let resolvedViolations = 0;
    let aiDetectedIssuesCount = 0;
    let humanConfirmedViolationsCount = 0;
    let pendingReviewsCount = 0;

    filteredReviews.forEach(r => {
      // 1. Initial findings vs Latest findings to avoid double counting across versions
      const initialFindings = r.versions?.[0]?.findings || r.versions?.[0]?.violations || r.violations || r.findings || [];
      const currentFindings = r.violations || r.findings || [];

      const initialCount = initialFindings.length;
      const currentCount = currentFindings.length;

      totalViolationsDetected += initialCount;
      aiDetectedIssuesCount += initialCount;

      // Resolved violations: calculated using version history
      if (r.versions && r.versions.length > 1) {
        const diff = initialCount - currentCount;
        if (diff > 0) {
          resolvedViolations += diff;
        }
      }

      // If asset was Approved by human reviewer, all active findings were reviewed and cleared
      if (r.status === 'Approved') {
        if (r.versions && r.versions.length <= 1 && initialCount > 0) {
          resolvedViolations += initialCount;
        }
      }

      // Human-confirmed count: reviews where reviewer signed off
      if (r.decisionDetails || r.status === 'Changes Requested' || r.status === 'Rejected') {
        humanConfirmedViolationsCount += currentCount;
      }

      // Pending human reviews
      if (r.status === 'Pending Review' || r.status === 'Changes Requested' || r.status === 'Pending' || r.status === 'Under Review' || r.status === 'Flagged') {
        pendingReviewsCount += 1;
      }
    });

    const resolutionRate = totalViolationsDetected > 0
      ? Math.round((resolvedViolations / totalViolationsDetected) * 100)
      : 0;

    return {
      totalReviews,
      averageScore,
      totalViolationsDetected,
      resolvedViolations,
      resolutionRate,
      pendingReviewsCount,
      aiDetectedIssuesCount,
      humanConfirmedViolationsCount
    };
  }, [filteredReviews]);

  // 6. VIOLATION ANALYTICS CHARTS DATA
  // A. Category Breakdown
  const categoryAnalytics = useMemo(() => {
    const catMap = {};
    filteredReviews.forEach(r => {
      const list = r.violations || r.findings || [];
      list.forEach(v => {
        const cat = v.category || 'General Compliance';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
    });

    const total = Object.values(catMap).reduce((a, b) => a + b, 0);
    const colors = ['#536DFE', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899', '#EF4444', '#06B6D4'];

    return Object.entries(catMap).map(([name, count], idx) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: colors[idx % colors.length]
    })).sort((a, b) => b.count - a.count);
  }, [filteredReviews]);

  // B. Severity Breakdown
  const severityAnalytics = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    filteredReviews.forEach(r => {
      const list = r.violations || r.findings || [];
      list.forEach(v => {
        const sev = v.severity || v.priority || 'Medium';
        if (sev === 'Critical') critical += 1;
        else if (sev === 'High') high += 1;
        else if (sev === 'Medium') medium += 1;
        else low += 1;
      });
    });

    const total = critical + high + medium + low;
    return [
      { name: 'Critical', count: critical, color: '#EF4444', percentage: total > 0 ? Math.round((critical / total) * 100) : 0 },
      { name: 'High', count: high, color: '#F59E0B', percentage: total > 0 ? Math.round((high / total) * 100) : 0 },
      { name: 'Medium', count: medium, color: '#536DFE', percentage: total > 0 ? Math.round((medium / total) * 100) : 0 },
      { name: 'Low', count: low, color: '#10B981', percentage: total > 0 ? Math.round((low / total) * 100) : 0 }
    ];
  }, [filteredReviews]);

  // C. Feature 1: Brand Health Index (Composite brand equity indicator)
  // Formula: Brand Health = (Average Compliance Score × 0.5) + (Resolution Rate × 0.3) + ((100 − Critical Risk Percentage) × 0.2)
  const brandHealthData = useMemo(() => {
    const calculated = calculateBrandHealth(filteredReviews);
    return {
      ...calculated,
      // Compatibility aliases for UI cards
      statusBadge: calculated.gradeInfo.badgeClass,
      statusColor: calculated.gradeInfo.color,
      summary: calculated.gradeInfo.summary,
      complianceDriver: calculated.contributingMetrics.averageComplianceScore.value,
      resolutionDriver: calculated.contributingMetrics.resolutionRate.value,
      riskDriver: calculated.contributingMetrics.criticalRiskBuffer.value
    };
  }, [filteredReviews]);

  // D. Feature 2: Visual vs Text Violations Segmentation
  const visualVsTextAnalytics = useMemo(() => {
    return calculateVisualVsTextAnalytics(filteredReviews);
  }, [filteredReviews]);

  // E. Feature 3: Monthly Reporting Cohorts with Month-over-Month (MoM) Deltas
  const monthlyCohorts = useMemo(() => {
    const rawCohorts = calculateMonthlyCohorts(orgReviews);
    return rawCohorts.map(cohort => ({
      ...cohort,
      totalReviews: cohort.reviewVolume,
      violations: cohort.totalViolations,
      resolved: cohort.resolvedViolations,
      visualIssues: cohort.visualViolations,
      textIssues: cohort.textViolations,
      resolutionRate: cohort.totalViolations > 0 ? Math.round((cohort.resolvedViolations / cohort.totalViolations) * 100) : 100
    }));
  }, [orgReviews]);

  // C. Most Frequently Violated Guidelines
  const frequentGuidelineViolations = useMemo(() => {
    const ruleMap = {};

    filteredReviews.forEach(r => {
      const list = r.violations || r.findings || [];
      list.forEach(v => {
        const ruleName = v.relevantGuideline || v.guidelineTitle || v.name || v.category || 'General Standard';
        if (!ruleMap[ruleName]) {
          ruleMap[ruleName] = {
            title: ruleName,
            category: v.category || 'General',
            severity: v.severity || v.priority || 'High',
            count: 0,
            affectedAssets: new Set(),
            examples: []
          };
        }
        ruleMap[ruleName].count += 1;
        ruleMap[ruleName].affectedAssets.add(r.id);
        if (v.problematicText && ruleMap[ruleName].examples.length < 2) {
          ruleMap[ruleName].examples.push(v.problematicText);
        }
      });
    });

    return Object.values(ruleMap)
      .map(item => ({
        ...item,
        affectedAssetsCount: item.affectedAssets.size
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredReviews]);

  // D. Resolved vs Unresolved Violations
  const resolvedVsUnresolvedData = useMemo(() => {
    const resolved = metricsData.resolvedViolations;
    const unresolved = Math.max(0, metricsData.totalViolationsDetected - resolved);
    return [
      { name: 'Resolved Violations', count: resolved, color: '#10B981' },
      { name: 'Unresolved / Active', count: unresolved, color: '#EF4444' }
    ];
  }, [metricsData]);

  // 7. COMPLIANCE TRENDS (Time-Based & AI Improvement Progression)
  const trendsData = useMemo(() => {
    const sorted = [...filteredReviews].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.date || 0).getTime();
      const timeB = new Date(b.timestamp || b.date || 0).getTime();
      return timeA - timeB;
    });

    let runningSum = 0;
    return sorted.map((r, idx) => {
      const score = typeof r.score === 'number' ? r.score : 0;
      runningSum += score;
      const initialScore = r.versions?.[0]?.score !== undefined ? r.versions[0].score : score;

      return {
        name: r.title.length > 14 ? `${r.title.slice(0, 14)}...` : r.title,
        date: r.date || `Asset #${idx + 1}`,
        score: score,
        initialScore: initialScore,
        average: Math.round(runningSum / (idx + 1)),
        volume: idx + 1
      };
    });
  }, [filteredReviews]);

  // AI Correction & Re-analysis Improvement Analytics
  const aiImprovementData = useMemo(() => {
    const multiVersionReviews = filteredReviews.filter(r => r.versions && r.versions.length > 1);
    if (multiVersionReviews.length === 0) {
      return {
        hasData: false,
        avgInitialScore: 0,
        avgRevisedScore: 0,
        avgDelta: 0,
        improvedCount: 0,
        totalMultiVersion: 0
      };
    }

    let sumInitial = 0;
    let sumRevised = 0;
    let improvedCount = 0;

    multiVersionReviews.forEach(r => {
      const initScore = r.versions[0]?.score || 0;
      const latestScore = r.versions[r.versions.length - 1]?.score || r.score || 0;
      sumInitial += initScore;
      sumRevised += latestScore;
      if (latestScore > initScore) improvedCount += 1;
    });

    const total = multiVersionReviews.length;
    const avgInitialScore = Math.round(sumInitial / total);
    const avgRevisedScore = Math.round(sumRevised / total);
    const avgDelta = avgRevisedScore - avgInitialScore;

    return {
      hasData: true,
      avgInitialScore,
      avgRevisedScore,
      avgDelta,
      improvedCount,
      totalMultiVersion: total
    };
  }, [filteredReviews]);

  // 8. REPEATED MISTAKES (Categorized Pattern Recognition)
  const repeatedMistakesPatterns = useMemo(() => {
    // 5 Specific Patterns requested by prompt
    const patterns = [
      {
        id: 'terminology',
        title: 'Incorrect Terminology & Naming',
        category: 'Terminology',
        patternRegex: /spelling|naming|casing|salesforce|product name|term|jargon/i,
        standardRule: 'Must use official canonical product names and exact trademark capitalization.',
        occurrences: 0,
        affectedAssets: new Set(),
        sampleExcerpt: null,
        severity: 'High'
      },
      {
        id: 'claims',
        title: 'Unsupported Promotional Claims',
        category: 'Restricted Claims',
        patternRegex: /claim|#1|guarantee|unmatched|superior|best|proven|fastest/i,
        standardRule: 'Superlative and comparative market statements require verified substantiation.',
        occurrences: 0,
        affectedAssets: new Set(),
        sampleExcerpt: null,
        severity: 'Critical'
      },
      {
        id: 'messaging',
        title: 'Incorrect Brand Messaging & Tone',
        category: 'Brand Voice and Tone',
        patternRegex: /voice|tone|slang|casual|messaging|clarity|informal/i,
        standardRule: 'Maintain professional, authoritative tone adhering to brand voice standards.',
        occurrences: 0,
        affectedAssets: new Set(),
        sampleExcerpt: null,
        severity: 'Medium'
      },
      {
        id: 'partnerships',
        title: 'False or Unverified Partnership Claims',
        category: 'Messaging Rules',
        patternRegex: /partner|certification|certified|official partner|alliance|endorsed/i,
        standardRule: 'Official partnership declarations require confirmed partner agreement.',
        occurrences: 0,
        affectedAssets: new Set(),
        sampleExcerpt: null,
        severity: 'Critical'
      },
      {
        id: 'trademark',
        title: 'Trademark Misuse & Omission',
        category: 'Trademark',
        patternRegex: /trademark|symbol|notice|foot|verb|generic/i,
        standardRule: 'Include mandatory attribution footnotes; never alter or abbreviate trademarks.',
        occurrences: 0,
        affectedAssets: new Set(),
        sampleExcerpt: null,
        severity: 'High'
      }
    ];

    filteredReviews.forEach(r => {
      const list = r.violations || r.findings || [];
      list.forEach(v => {
        const textToMatch = `${v.category || ''} ${v.relevantGuideline || ''} ${v.explanation || ''} ${v.detail || ''}`;
        patterns.forEach(pat => {
          if (pat.patternRegex.test(textToMatch)) {
            pat.occurrences += 1;
            pat.affectedAssets.add(r.id);
            if (!pat.sampleExcerpt && v.problematicText) {
              pat.sampleExcerpt = v.problematicText;
            }
          }
        });
      });
    });

    return patterns.map(p => ({
      ...p,
      affectedAssetsCount: p.affectedAssets.size
    })).sort((a, b) => b.occurrences - a.occurrences);
  }, [filteredReviews]);

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-16">
      {/* Top Header Banner with Organisation Isolation Selector */}
      <div className="neu-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
              Governance Insights & Telemetry
            </span>
            <span className="text-xs text-[#8A99AD] font-semibold">
              Isolated Organisation View
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#202B45] tracking-tight">
            Governance & Audit Analytics
          </h2>
          <p className="text-xs md:text-sm text-[#5E6E82] font-medium mt-1">
            Empirical compliance scores, violation trends, and recurring mistake patterns for <strong>{activeOrg}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="neu-btn px-4 py-2.5 text-xs font-bold text-[#202B45] hover:text-[#536DFE] flex items-center gap-2 rounded-xl transition-all"
            title="Generate executive PDF governance report"
          >
            <Printer className="w-4 h-4 text-[#536DFE]" />
            Generate PDF Report
          </button>

          {/* ORGANISATION SELECTOR DROPDOWN (Strict Isolation) */}
          <div className="neu-card-sm p-2.5 bg-white/50 border border-white/80 rounded-2xl flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#536DFE]" />
            <span className="text-xs font-bold text-[#202B45]">Active:</span>

            <select
              value={activeOrg}
              onChange={(e) => {
                setSelectedOrganisation(e.target.value);
              }}
              className="bg-transparent text-xs font-bold text-[#202B45] cursor-pointer focus:outline-none"
            >
              {availableOrganisations.map(org => {
                const count = reviews.filter(r => matchesOrganisation(r.organisationId || r.organisation, org)).length;
                return (
                  <option key={org} value={org}>
                    {org} ({count} reviews)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* BRAND HEALTH SCORE INDEX CARD */}
      <div className="neu-card p-6 md:p-7 bg-gradient-to-br from-white/95 via-[#E8ECF3] to-white/85 border border-white space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pb-5 border-b border-[#D5DDE7]/70">
          <div className="flex items-center gap-4">
            <BrandHealthGauge
              score={brandHealthData.score}
              grade={brandHealthData.grade}
              gradeInfo={brandHealthData.gradeInfo}
              size={96}
              strokeWidth={9}
              showGrade={false}
            />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-extrabold text-[#202B45]">
                  Brand Health Index
                </h3>
                <span className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full ${brandHealthData.gradeInfo?.badgeClass || brandHealthData.statusBadge}`}>
                  {brandHealthData.grade}
                </span>
              </div>
              <p className="text-xs text-[#5E6E82] mt-1 max-w-xl font-medium">
                {brandHealthData.summary}
              </p>
              <p className="text-[11px] text-[#8A99AD] mt-1 font-mono">
                Formula: (Avg Compliance × 0.5) + (Resolution Rate × 0.3) + ((100 − Critical Risk %) × 0.2)
              </p>
            </div>
          </div>

          <div className="neu-card-sm px-5 py-3 bg-white/90 rounded-2xl border border-white flex items-center gap-3 self-end md:self-auto">
            <div className="text-right">
              <span className="text-[10px] font-bold text-[#8A99AD] uppercase tracking-wider block">Composite Index</span>
              <span className="text-3xl font-black" style={{ color: brandHealthData.statusColor }}>
                {brandHealthData.score}<span className="text-sm font-bold text-[#8A99AD]">/100</span>
              </span>
            </div>
          </div>
        </div>

        {/* Contributing Metrics Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Metric 1: Average Compliance Score (50%) */}
          <div className="p-4 rounded-2xl bg-white/70 neu-card-sm border border-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#5E6E82]">Average Compliance Score (50%)</span>
              <span className="font-bold text-[#202B45]">{brandHealthData.contributingMetrics?.averageComplianceScore.value ?? brandHealthData.complianceDriver}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#D1D9E6] overflow-hidden">
              <div
                className="h-full bg-[#536DFE] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, brandHealthData.contributingMetrics?.averageComplianceScore.value ?? brandHealthData.complianceDriver)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8A99AD] pt-1">
              <span>Points Added:</span>
              <strong className="text-[#536DFE]">+{brandHealthData.contributingMetrics?.averageComplianceScore.weightedContribution ?? ((brandHealthData.complianceDriver * 0.5).toFixed(1))} pts</strong>
            </div>
          </div>

          {/* Metric 2: Resolution Rate (30%) */}
          <div className="p-4 rounded-2xl bg-white/70 neu-card-sm border border-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#5E6E82]">Resolution Rate (30%)</span>
              <span className="font-bold text-[#10B981]">{brandHealthData.contributingMetrics?.resolutionRate.value ?? brandHealthData.resolutionDriver}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#D1D9E6] overflow-hidden">
              <div
                className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, brandHealthData.contributingMetrics?.resolutionRate.value ?? brandHealthData.resolutionDriver)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8A99AD] pt-1">
              <span>Points Added:</span>
              <strong className="text-[#10B981]">+{brandHealthData.contributingMetrics?.resolutionRate.weightedContribution ?? ((brandHealthData.resolutionDriver * 0.3).toFixed(1))} pts</strong>
            </div>
          </div>

          {/* Metric 3: Critical Risk Buffer (20%) */}
          <div className="p-4 rounded-2xl bg-white/70 neu-card-sm border border-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#5E6E82]">Critical Risk Buffer (20%)</span>
              <span className="font-bold text-[#202B45]">{brandHealthData.contributingMetrics?.criticalRiskBuffer.value ?? brandHealthData.riskDriver}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#D1D9E6] overflow-hidden">
              <div
                className="h-full bg-[#00E5FF] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, brandHealthData.contributingMetrics?.criticalRiskBuffer.value ?? brandHealthData.riskDriver)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8A99AD] pt-1">
              <span>Critical Issues: {brandHealthData.contributingMetrics?.criticalRiskBuffer.criticalRiskPercentage ?? 0}%</span>
              <strong className="text-[#0284C7]">+{brandHealthData.contributingMetrics?.criticalRiskBuffer.weightedContribution ?? ((brandHealthData.riskDriver * 0.2).toFixed(1))} pts</strong>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR (Section 5) */}
      <div className="neu-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#536DFE]" />
            <h3 className="text-xs font-bold text-[#202B45] uppercase tracking-wider">
              Analytics Filter Controls
            </h3>
          </div>

          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="neu-btn px-3 py-1 text-xs font-bold text-[#EF4444] hover:bg-red-50 flex items-center gap-1 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Filter 1: Date Range */}
          <div>
            <label className="text-[10px] font-bold text-[#8A99AD] uppercase block mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="neu-input w-full px-3 py-2 text-xs text-[#202B45]"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          {/* Filter 2: Content Type */}
          <div>
            <label className="text-[10px] font-bold text-[#8A99AD] uppercase block mb-1">
              Content Type
            </label>
            <select
              value={selectedContentType}
              onChange={(e) => setSelectedContentType(e.target.value)}
              className="neu-input w-full px-3 py-2 text-xs text-[#202B45]"
            >
              <option value="all">All Types ({orgReviews.length})</option>
              {contentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Filter 3: Violation Category */}
          <div>
            <label className="text-[10px] font-bold text-[#8A99AD] uppercase block mb-1">
              Violation Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="neu-input w-full px-3 py-2 text-xs text-[#202B45]"
            >
              <option value="all">All Categories</option>
              {violationCategoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Filter 4: Severity */}
          <div>
            <label className="text-[10px] font-bold text-[#8A99AD] uppercase block mb-1">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="neu-input w-full px-3 py-2 text-xs text-[#202B45]"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Filter 5: Review Status */}
          <div>
            <label className="text-[10px] font-bold text-[#8A99AD] uppercase block mb-1">
              Review Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="neu-input w-full px-3 py-2 text-xs text-[#202B45]"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Changes Requested">Changes Requested</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Flagged">Flagged</option>
            </select>
          </div>
        </div>
      </div>

      {/* ZERO RECORDS EMPTY STATE FOR ORGANISATION */}
      {orgReviews.length === 0 ? (
        <div className="neu-card p-14 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-white/80 neu-card-sm flex items-center justify-center text-[#8A99AD] mb-4">
            <Inbox className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-[#202B45]">
            No governance records available for {activeOrg}
          </h4>
          <p className="text-xs text-[#5E6E82] max-w-md mt-1.5 mb-6">
            There are no recorded content reviews or compliance analyses for this organisation yet. Submit collateral in the Content Review studio to generate telemetry.
          </p>
          <div className="p-3 rounded-xl neu-card-sm bg-[#536DFE]/10 border border-[#536DFE]/25 text-xs text-[#536DFE] font-semibold">
            Data isolation active: Only records tagged with "{activeOrg}" are displayed.
          </div>
        </div>
      ) : filteredReviews.length === 0 ? (
        /* ZERO MATCHES FOR ACTIVE FILTER SELECTION */
        <div className="neu-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#8A99AD] mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#202B45]">
            No records match the active filter criteria
          </h4>
          <p className="text-xs text-[#5E6E82] max-w-sm mt-1 mb-5">
            Adjust your date range, content type, severity, or status filters to view records.
          </p>
          <button
            onClick={resetFilters}
            className="neu-btn-primary px-4 py-2 text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* SECTION 1: OVERVIEW METRICS (5 Key KPI Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* KPI 1: Total Content Reviews */}
            <div className="neu-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A99AD]">
                  Content Reviews
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#536DFE]/15 text-[#536DFE] flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#202B45]">
                {metricsData.totalReviews}
              </div>
              <p className="text-[11px] text-[#5E6E82] mt-1 font-medium">
                {metricsData.totalReviews === 1 ? 'Asset evaluated' : 'Assets evaluated'} in {activeOrg}
              </p>
            </div>

            {/* KPI 2: Average Compliance Score */}
            <div className="neu-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A99AD]">
                  Average Score
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#202B45]">
                {metricsData.averageScore}%
              </div>
              <p className="text-[11px] text-[#5E6E82] mt-1 font-medium">
                Standard benchmark (85% Target)
              </p>
            </div>

            {/* KPI 3: Total Violations Detected */}
            <div className="neu-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A99AD]">
                  Violations Detected
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#EF4444]">
                {metricsData.totalViolationsDetected}
              </div>
              <p className="text-[11px] text-[#5E6E82] mt-1 font-medium">
                Total initial discrepancies flagged
              </p>
            </div>

            {/* KPI 4: Resolved Violations (Using Version History) */}
            <div className="neu-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A99AD]">
                  Resolved Issues
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 text-[#047857] flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#10B981] flex items-baseline gap-2">
                <span>{metricsData.resolvedViolations}</span>
                <span className="text-xs font-bold text-[#047857] px-1.5 py-0.5 rounded-md bg-[#10B981]/20">
                  {metricsData.resolutionRate}%
                </span>
              </div>
              <p className="text-[11px] text-[#5E6E82] mt-1 font-medium">
                Fixed through AI edits & sign-off
              </p>
            </div>

            {/* KPI 5: Pending Human Reviews */}
            <div className="neu-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A99AD]">
                  Pending Decisions
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/15 text-[#B45309] flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#F59E0B]">
                {metricsData.pendingReviewsCount}
              </div>
              <p className="text-[11px] text-[#5E6E82] mt-1 font-medium">
                Awaiting final human review
              </p>
            </div>
          </div>

          {/* AI-Detected Issues vs Human-Confirmed Verification Banner */}
          <div className="neu-card p-4 bg-gradient-to-r from-white/70 via-white/50 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-white/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#536DFE]/15 text-[#536DFE] flex items-center justify-center neu-card-sm flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-[#202B45] block">Telemetry Attribution Breakdown</span>
                <span className="text-[#5E6E82]">
                  Distinction between automated Gemini rule findings and human auditor verified violations.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold self-start sm:self-auto">
              <div>
                <span className="text-[#8A99AD] text-[10px] block">AI-Detected Issues</span>
                <span className="font-extrabold text-[#202B45]">{metricsData.aiDetectedIssuesCount} flagged</span>
              </div>
              <div className="w-px h-6 bg-[#D1D9E6]" />
              <div>
                <span className="text-[#8A99AD] text-[10px] block">Human-Confirmed</span>
                <span className="font-extrabold text-[#536DFE]">{metricsData.humanConfirmedViolationsCount} verified</span>
              </div>
            </div>
          </div>

          {/* SECTION 1B: VISUAL VS TEXT VIOLATIONS BREAKDOWN */}
          <div className="neu-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center neu-card-sm">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">
                    Visual vs. Textual Violations Breakdown
                  </h3>
                  <p className="text-xs text-[#5E6E82]">
                    Segmenting creative visual defects (palette, logo clear-space, typography & layout) against copy compliance
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 neu-card-sm border border-white text-[#202B45]">
                {visualVsTextAnalytics.total} Total Issues Classified
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
              {/* Visual Issues Tile */}
              <div className="p-4 rounded-2xl bg-white/60 neu-card-sm border border-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> Visual Creative Issues
                  </span>
                  <span className="text-base font-extrabold text-[#8B5CF6]">
                    {visualVsTextAnalytics.visualPercentage}%
                  </span>
                </div>
                <div className="text-2xl font-black text-[#202B45]">
                  {visualVsTextAnalytics.visualCount} <span className="text-xs font-normal text-[#8A99AD]">flags</span>
                </div>
                <p className="text-[11px] text-[#5E6E82]">
                  Brand palette deviations, logo safe-zone infractions & contrast defects.
                </p>
                <div className="text-[10px] text-[#8A99AD] pt-1 border-t border-[#D5DDE7]/50">
                  Resolved: <strong className="text-[#10B981]">{visualVsTextAnalytics.visualResolved}</strong> cleared
                </div>
              </div>

              {/* Textual Issues Tile */}
              <div className="p-4 rounded-2xl bg-white/60 neu-card-sm border border-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#536DFE] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Textual Copy Violations
                  </span>
                  <span className="text-base font-extrabold text-[#536DFE]">
                    {visualVsTextAnalytics.textPercentage}%
                  </span>
                </div>
                <div className="text-2xl font-black text-[#202B45]">
                  {visualVsTextAnalytics.textCount} <span className="text-xs font-normal text-[#8A99AD]">flags</span>
                </div>
                <p className="text-[11px] text-[#5E6E82]">
                  Unsubstantiated claims, non-compliant terminology, unauthorized partnerships.
                </p>
                <div className="text-[10px] text-[#8A99AD] pt-1 border-t border-[#D5DDE7]/50">
                  Resolved: <strong className="text-[#10B981]">{visualVsTextAnalytics.textResolved}</strong> cleared
                </div>
              </div>

              {/* Donut Chart Comparison */}
              <div className="h-44 flex items-center justify-center">
                {visualVsTextAnalytics.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={visualVsTextAnalytics.chartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                      >
                        {visualVsTextAnalytics.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-[#8A99AD]">Zero violations to chart</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: VIOLATION ANALYTICS (Charts & Breakdown) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart A: Violations by Category (Pie / Donut) */}
            <div className="lg:col-span-6 neu-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-[#202B45]">
                    Violations by Category
                  </h3>
                  <span className="text-[10px] font-bold text-[#8A99AD] uppercase">
                    {categoryAnalytics.length} Categories
                  </span>
                </div>
                <p className="text-xs text-[#5E6E82] mb-4">
                  Distribution of identified brand violations across codified categories
                </p>

                {categoryAnalytics.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryAnalytics}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {categoryAnalytics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 rounded-2xl neu-input flex items-center justify-center text-xs text-[#8A99AD]">
                    No categorized violations recorded.
                  </div>
                )}
              </div>

              {/* Category Legend & Counts */}
              {categoryAnalytics.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#D5DDE7]/70">
                  {categoryAnalytics.slice(0, 6).map(cat => (
                    <div key={cat.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white/40">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-semibold text-[#202B45] truncate">{cat.name}</span>
                      </div>
                      <span className="font-bold text-[#202B45] pl-1.5">{cat.count} ({cat.percentage}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chart B: Severity Breakdown & Resolved vs Unresolved */}
            <div className="lg:col-span-6 neu-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-[#202B45]">
                    Violation Severity & Resolution
                  </h3>
                  <span className="text-[10px] font-bold text-[#8A99AD] uppercase">
                    Risk Breakdown
                  </span>
                </div>
                <p className="text-xs text-[#5E6E82] mb-4">
                  Proportion of Critical, High, and Medium issues, plus resolution status
                </p>

                {/* Severity Bar Chart */}
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={severityAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1D9E6" />
                      <XAxis dataKey="name" stroke="#8A99AD" fontSize={11} tickLine={false} />
                      <YAxis stroke="#8A99AD" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {severityAnalytics.map((entry, index) => (
                          <Cell key={`sev-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Resolved vs Unresolved Summary Cards */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#D5DDE7]/70">
                <div className="neu-card-sm p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857] block mb-0.5">
                    Resolved Violations
                  </span>
                  <div className="text-xl font-extrabold text-[#047857]">
                    {metricsData.resolvedViolations}
                  </div>
                  <span className="text-[10px] text-[#065F46] font-medium">
                    {metricsData.resolutionRate}% resolution rate
                  </span>
                </div>

                <div className="neu-card-sm p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C] block mb-0.5">
                    Unresolved / Active
                  </span>
                  <div className="text-xl font-extrabold text-[#B91C1C]">
                    {Math.max(0, metricsData.totalViolationsDetected - metricsData.resolvedViolations)}
                  </div>
                  <span className="text-[10px] text-[#991B1B] font-medium">
                    Awaiting correction or sign-off
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: COMPLIANCE TRENDS & AI CORRECTION IMPROVEMENT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chronological Score & Volume Trend Chart */}
            <div className="lg:col-span-8 neu-card p-6">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">
                    Compliance Score & Volume Progression
                  </h3>
                  <p className="text-xs text-[#5E6E82]">
                    Chronological compliance score trajectory across reviewed assets
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-[#536DFE]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#536DFE]" />
                    Score (%)
                  </span>
                  <span className="flex items-center gap-1.5 text-[#10B981]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    Cumulative Volume
                  </span>
                </div>
              </div>

              {trendsData.length > 0 ? (
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#536DFE" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#536DFE" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1D9E6" />
                      <XAxis dataKey="date" stroke="#8A99AD" fontSize={11} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="#8A99AD" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="score" stroke="#536DFE" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 rounded-2xl neu-input flex items-center justify-center text-xs text-[#8A99AD]">
                  No historical trend data logged yet.
                </div>
              )}
            </div>

            {/* AI Improvement Telemetry Card */}
            <div className="lg:col-span-4 neu-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#536DFE]" />
                  <h3 className="text-base font-bold text-[#202B45]">
                    AI Correction Impact
                  </h3>
                </div>
                <p className="text-xs text-[#5E6E82] mb-4">
                  Empirical compliance gains after editor corrections and re-analysis
                </p>

                {aiImprovementData.hasData ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl neu-card-sm bg-gradient-to-tr from-[#10B981]/15 to-transparent border border-[#10B981]/30">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857] block mb-1">
                        Average Score Improvement
                      </span>
                      <div className="text-3xl font-extrabold text-[#047857] flex items-center gap-1.5">
                        <ArrowUpRight className="w-6 h-6 text-[#10B981]" />
                        +{aiImprovementData.avgDelta}%
                      </div>
                      <p className="text-xs text-[#065F46] mt-1 font-medium">
                        Initial avg: {aiImprovementData.avgInitialScore}% → Re-analysis avg: {aiImprovementData.avgRevisedScore}%
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/50">
                        <span className="text-[#5E6E82]">Multi-Version Assets:</span>
                        <span className="font-bold text-[#202B45]">{aiImprovementData.totalMultiVersion}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/50">
                        <span className="text-[#5E6E82]">Assets Improved on Re-check:</span>
                        <span className="font-bold text-[#10B981]">{aiImprovementData.improvedCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/50">
                        <span className="text-[#5E6E82]">Resolved Violations Count:</span>
                        <span className="font-bold text-[#536DFE]">{metricsData.resolvedViolations}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl neu-input text-center">
                    <RotateCcw className="w-8 h-8 text-[#8A99AD] mx-auto mb-2" />
                    <h5 className="text-xs font-bold text-[#202B45]">No Re-analyses Logged Yet</h5>
                    <p className="text-[11px] text-[#5E6E82] mt-1">
                      Improvement metrics populate once content corrections are submitted for re-analysis in the Content Review studio.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#D5DDE7]/70 text-[11px] text-[#8A99AD] font-semibold">
                Telemetry calculated strictly from multi-version analysis cycles.
              </div>
            </div>
          </div>

          {/* SECTION 4: REPEATED MISTAKES & RECURRING PROBLEMS */}
          <div className="neu-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#202B45]">
                  Recurring Compliance Mistakes & Patterns
                </h3>
                <p className="text-xs text-[#5E6E82]">
                  Most frequent brand violations categorized across terminology, claims, tone, and trademark standards
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#536DFE]/15 text-[#536DFE] self-start sm:self-auto">
                {repeatedMistakesPatterns.reduce((sum, p) => sum + p.occurrences, 0)} Total Occurrences
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repeatedMistakesPatterns.map((pattern) => {
                const isFrequent = pattern.occurrences > 0;
                return (
                  <div
                    key={pattern.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isFrequent
                        ? pattern.severity === 'Critical'
                          ? 'bg-[#EF4444]/10 border-[#EF4444]/30 neu-card-sm'
                          : pattern.severity === 'High'
                          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 neu-card-sm'
                          : 'bg-white/60 border-white/80 neu-card-sm'
                        : 'bg-white/30 border-white/40 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 text-[#202B45] border border-[#D1D9E6]">
                          {pattern.category}
                        </span>
                        <h4 className="text-xs font-bold text-[#202B45] mt-1.5 truncate">
                          {pattern.title}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pattern.severity === 'Critical'
                          ? 'bg-[#EF4444]/20 text-[#B91C1C]'
                          : pattern.severity === 'High'
                          ? 'bg-[#F59E0B]/20 text-[#B45309]'
                          : 'bg-[#536DFE]/20 text-[#536DFE]'
                      }`}>
                        {pattern.occurrences} {pattern.occurrences === 1 ? 'flag' : 'flags'}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#5E6E82] leading-relaxed">
                      {pattern.standardRule}
                    </p>

                    {pattern.sampleExcerpt && (
                      <div className="p-2 rounded-xl bg-white/80 border-l-2 border-[#EF4444] text-[11px] text-[#202B45]">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#EF4444] block">
                          Sample Problematic Excerpt
                        </span>
                        <blockquote className="italic font-serif truncate">
                          "{pattern.sampleExcerpt}"
                        </blockquote>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-semibold text-[#8A99AD] pt-1 border-t border-black/5">
                      <span>Affected Assets: <strong>{pattern.affectedAssetsCount}</strong></span>
                      <span className={isFrequent ? 'text-[#EF4444] font-bold' : 'text-[#10B981]'}>
                        {isFrequent ? 'Action Needed' : 'No Flags'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOST FREQUENTLY VIOLATED GUIDELINES TABLE */}
          {frequentGuidelineViolations.length > 0 && (
            <div className="neu-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">
                    Most Frequently Violated Guidelines
                  </h3>
                  <p className="text-xs text-[#5E6E82]">
                    Ranked guidelines by violation volume across {activeOrg} assets
                  </p>
                </div>
                <span className="text-xs font-bold text-[#8A99AD]">
                  Top {frequentGuidelineViolations.length} Rules
                </span>
              </div>

              <div className="space-y-3">
                {frequentGuidelineViolations.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl neu-card-sm bg-white/60 border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-[#536DFE]/15 text-[#536DFE] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-[#202B45] truncate">
                            {item.title}
                          </h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/80 text-[#5E6E82] border border-[#D1D9E6]">
                            {item.category}
                          </span>
                        </div>
                        {item.examples[0] && (
                          <p className="text-[11px] text-[#5E6E82] mt-0.5 truncate italic">
                            Flagged snippet: "{item.examples[0]}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0 self-end md:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-[#8A99AD] font-semibold block">Occurrences</span>
                        <span className="font-extrabold text-[#EF4444] text-sm">{item.count} flags</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#8A99AD] font-semibold block">Assets</span>
                        <span className="font-bold text-[#202B45] text-sm">{item.affectedAssetsCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 8: REVIEW PIPELINE AUDIT LEDGER */}
          <div className="neu-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#202B45]">
                  Evaluated Asset Ledger & Audit Trails
                </h3>
                <p className="text-xs text-[#5E6E82]">
                  Individual collateral records, compliance scores, and human sign-off status
                </p>
              </div>
              <span className="text-xs font-bold text-[#536DFE]">
                {filteredReviews.length} Asset{filteredReviews.length === 1 ? '' : 's'} Logged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D5DDE7]/70 text-[#8A99AD] text-[10px] uppercase tracking-wider">
                    <th className="pb-3 font-bold">Collateral Title</th>
                    <th className="pb-3 font-bold">Category</th>
                    <th className="pb-3 font-bold">Score</th>
                    <th className="pb-3 font-bold">Versions</th>
                    <th className="pb-3 font-bold">Governance Status</th>
                    <th className="pb-3 font-bold">Reviewer & Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D5DDE7]/40">
                  {filteredReviews.map((r) => {
                    const statusColor = r.status === 'Approved'
                      ? 'bg-[#10B981]/15 text-[#047857]'
                      : r.status === 'Changes Requested'
                      ? 'bg-[#F59E0B]/15 text-[#B45309]'
                      : r.status === 'Rejected'
                      ? 'bg-[#EF4444]/15 text-[#B91C1C]'
                      : 'bg-[#536DFE]/15 text-[#536DFE]';

                    return (
                      <tr key={r.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-3 font-bold text-[#202B45] max-w-[200px] truncate">
                          {r.title}
                        </td>
                        <td className="py-3 text-[#5E6E82]">
                          {r.contentType || r.type || 'General'}
                        </td>
                        <td className="py-3 font-extrabold">
                          <span className={r.score >= 85 ? 'text-[#10B981]' : r.score >= 70 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}>
                            {r.score}%
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md bg-white/70 text-[#5E6E82] border border-[#D1D9E6] font-bold text-[10px]">
                            v{r.versions?.length || 1}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${statusColor}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 text-[#8A99AD] text-[11px]">
                          {r.decisionDetails?.reviewer ? (
                            <span>{r.decisionDetails.reviewer} ({r.decisionDetails.formattedDate})</span>
                          ) : (
                            <span>Pending Sign-off</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 7: MONTH-BY-MONTH GOVERNANCE PERFORMANCE REPORTS */}
          <div className="neu-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#202B45] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#536DFE]" />
                  Monthly Governance Cohort Reports
                </h3>
                <p className="text-xs text-[#5E6E82]">
                  Month-by-month compliance performance and violation resolution efficiency for {activeOrg}
                </p>
              </div>
              <span className="text-xs font-bold text-[#8A99AD]">
                {monthlyCohorts.length} Reporting Cohort{monthlyCohorts.length === 1 ? '' : 's'}
              </span>
            </div>

            {monthlyCohorts.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Calendar className="w-10 h-10 text-[#8A99AD] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-[#202B45]">No Review Records Logged Yet</p>
                <p className="text-xs text-[#5E6E82] mt-0.5">
                  Monthly cohorts will dynamically aggregate as content reviews are completed for {activeOrg}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D5DDE7] text-[10px] font-bold text-[#8A99AD] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Reporting Period</th>
                      <th className="py-2.5 px-3">Monthly Volume</th>
                      <th className="py-2.5 px-3">Avg Compliance</th>
                      <th className="py-2.5 px-3">Resolved Violations</th>
                      <th className="py-2.5 px-3">Pending Violations</th>
                      <th className="py-2.5 px-3">Visual / Text Ratio</th>
                      <th className="py-2.5 px-3 text-right">MoM Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5DDE7]/50 font-medium text-[#202B45]">
                    {monthlyCohorts.map((cohort, idx) => (
                      <tr key={idx} className="hover:bg-white/40 transition-colors">
                        <td className="py-3 px-3 font-bold">{cohort.month}</td>
                        
                        {/* Review Volume with MoM Delta */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold">{cohort.totalReviews} asset{cohort.totalReviews === 1 ? '' : 's'}</span>
                            {cohort.momVolumeDelta !== null && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                                cohort.momVolumeDelta > 0 ? 'bg-emerald-100 text-emerald-800' :
                                cohort.momVolumeDelta < 0 ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {cohort.momVolumeDelta > 0 ? `+${cohort.momVolumeDelta}` : cohort.momVolumeDelta} MoM
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Average Compliance Score with MoM Delta */}
                        <td className="py-3 px-3 font-bold">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                              cohort.averageScore >= 90 ? 'bg-[#10B981]/15 text-[#047857]' :
                              cohort.averageScore >= 75 ? 'bg-[#536DFE]/15 text-[#536DFE]' :
                              cohort.averageScore >= 50 ? 'bg-[#F59E0B]/15 text-[#B45309]' :
                              'bg-[#EF4444]/15 text-[#B91C1C]'
                            }`}>
                              {cohort.averageScore}%
                            </span>
                            {cohort.momScoreDelta !== null && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                                cohort.momScoreDelta > 0 ? 'bg-emerald-100 text-emerald-800' :
                                cohort.momScoreDelta < 0 ? 'bg-rose-100 text-rose-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {cohort.momScoreDelta > 0 ? `+${cohort.momScoreDelta}%` : `${cohort.momScoreDelta}%`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Resolved Violations with MoM Delta */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#10B981]">{cohort.resolved} cleared</span>
                            {cohort.momResolvedDelta !== null && (
                              <span className="text-[10px] text-[#5E6E82]">
                                ({cohort.momResolvedDelta >= 0 ? `+${cohort.momResolvedDelta}` : cohort.momResolvedDelta})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Pending Violations */}
                        <td className="py-3 px-3">
                          <span className={`font-bold ${cohort.pendingViolations > 0 ? 'text-[#F59E0B]' : 'text-[#8A99AD]'}`}>
                            {cohort.pendingViolations} pending
                          </span>
                        </td>

                        {/* Visual / Text Ratio */}
                        <td className="py-3 px-3 text-[11px] text-[#5E6E82]">
                          <span className="text-[#8B5CF6] font-bold">{cohort.visualIssues} visual</span>
                          <span className="mx-1">/</span>
                          <span className="text-[#536DFE] font-bold">{cohort.textIssues} text</span>
                        </td>

                        {/* MoM Trend Status Badge */}
                        <td className="py-3 px-3 text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cohort.averageScore >= 90 ? 'bg-[#10B981]/15 text-[#047857]' :
                            cohort.averageScore >= 75 ? 'bg-[#536DFE]/15 text-[#536DFE]' :
                            cohort.averageScore >= 50 ? 'bg-[#F59E0B]/15 text-[#B45309]' :
                            'bg-[#EF4444]/15 text-[#B91C1C]'
                          }`}>
                            {cohort.averageScore >= 90 ? 'Optimal' :
                             cohort.averageScore >= 75 ? 'Stable' :
                             cohort.averageScore >= 50 ? 'Guarded' : 'Action Required'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* EXECUTIVE PDF REPORT MODAL WITH PRINT-TO-PDF SUPPORT */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-6 md:p-8 shadow-2xl neu-card border border-white flex flex-col overflow-y-auto">
            {/* Modal Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-[#D5DDE7]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#536DFE]">
                  Official Governance Document
                </span>
                <h3 className="text-xl font-extrabold text-[#202B45]">
                  Executive Brand Compliance Report
                </h3>
                <p className="text-xs text-[#5E6E82]">
                  Organisation: <strong>{activeOrg}</strong> • Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="neu-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="neu-btn p-2 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Report Content */}
            <div className="space-y-6 pt-5 print:p-0">
              {/* Executive Summary */}
              <div className="p-4 rounded-2xl bg-[#E8ECF3] border border-white flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[#8A99AD] uppercase">Brand Health Index</span>
                  <div className="text-3xl font-black text-[#536DFE] mt-0.5">
                    {brandHealthData.score}/100 • {brandHealthData.grade}
                  </div>
                  <p className="text-xs text-[#5E6E82] mt-1">
                    Based on {metricsData.totalReviews} evaluated assets, {metricsData.totalViolationsDetected} detected issues, and {metricsData.resolutionRate}% resolution rate.
                  </p>
                </div>
                <div className="neu-card-sm px-4 py-2 bg-white rounded-xl text-center">
                  <span className="text-[10px] font-bold text-[#8A99AD] uppercase block">Benchmark</span>
                  <span className="text-xl font-bold text-[#10B981]">{metricsData.averageScore}% Avg</span>
                </div>
              </div>

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-[#8A99AD] font-bold block">Total Reviews</span>
                  <span className="text-lg font-bold text-[#202B45]">{metricsData.totalReviews}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-[#8A99AD] font-bold block">Violations Detected</span>
                  <span className="text-lg font-bold text-[#EF4444]">{metricsData.totalViolationsDetected}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-[#8A99AD] font-bold block">Resolved Violations</span>
                  <span className="text-lg font-bold text-[#10B981]">{metricsData.resolvedViolations}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] text-[#8A99AD] font-bold block">Visual vs Text</span>
                  <span className="text-lg font-bold text-[#8B5CF6]">{visualVsTextAnalytics.visualCount}v / {visualVsTextAnalytics.textCount}t</span>
                </div>
              </div>

              {/* Monthly Cohorts Table */}
              <div>
                <h4 className="text-sm font-bold text-[#202B45] mb-2">Monthly Reporting Cohorts</h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 text-[10px] uppercase text-gray-500 font-bold">
                      <tr>
                        <th className="p-2.5">Period</th>
                        <th className="p-2.5">Reviews</th>
                        <th className="p-2.5">Score</th>
                        <th className="p-2.5">Violations</th>
                        <th className="p-2.5">Resolution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {monthlyCohorts.map((c, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-bold">{c.month}</td>
                          <td className="p-2.5">{c.totalReviews}</td>
                          <td className="p-2.5 font-bold">{c.averageScore}%</td>
                          <td className="p-2.5">{c.violations}</td>
                          <td className="p-2.5 text-[#10B981] font-bold">{c.resolutionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Sign-off Stamp */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-[#5E6E82] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#202B45] block">Automated Governance Audit Seal</span>
                  Verified against {activeOrg} brand rulebooks and multimodal criteria.
                </div>
                <span className="font-mono text-[10px] text-[#8A99AD]">CERT-BG-{Date.now().toString().slice(-6)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
