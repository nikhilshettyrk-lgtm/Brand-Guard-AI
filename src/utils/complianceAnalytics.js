/**
 * BrandGuard AI - Compliance Analytics Engine
 * Pure mathematical calculators for Brand Health Index, Visual vs Text Violations,
 * and Monthly Reporting Cohorts.
 * 
 * Strict Organisation Isolation: Accepts only organisation-filtered review records.
 * Deterministic: Does NOT generate mock or artificial historical data.
 */

/**
 * Returns qualitative grade, colors and status badge based on exact requirements:
 * 90–100: Optimal
 * 75–89: Stable
 * 50–74: Guarded
 * Below 50: Action Required
 */
export function getBrandHealthGrade(score) {
  const rounded = Math.round(score);
  if (rounded >= 90) {
    return {
      grade: 'Optimal',
      color: '#10B981',
      bgColor: 'bg-[#10B981]/15',
      textColor: 'text-[#047857]',
      borderColor: 'border-[#10B981]/30',
      badgeClass: 'bg-[#10B981]/15 text-[#047857] border border-[#10B981]/30',
      summary: 'Brand identity is well-protected with high compliance standards.'
    };
  }
  if (rounded >= 75) {
    return {
      grade: 'Stable',
      color: '#536DFE',
      bgColor: 'bg-[#536DFE]/15',
      textColor: 'text-[#536DFE]',
      borderColor: 'border-[#536DFE]/30',
      badgeClass: 'bg-[#536DFE]/15 text-[#536DFE] border border-[#536DFE]/30',
      summary: 'Consistent governance with isolated, manageable policy deviations.'
    };
  }
  if (rounded >= 50) {
    return {
      grade: 'Guarded',
      color: '#F59E0B',
      bgColor: 'bg-[#F59E0B]/15',
      textColor: 'text-[#B45309]',
      borderColor: 'border-[#F59E0B]/30',
      badgeClass: 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30',
      summary: 'Elevated policy deviations requiring reviewer oversight and remediation.'
    };
  }
  return {
    grade: 'Action Required',
    color: '#EF4444',
    bgColor: 'bg-[#EF4444]/15',
    textColor: 'text-[#B91C1C]',
    borderColor: 'border-[#EF4444]/30',
    badgeClass: 'bg-[#EF4444]/15 text-[#B91C1C] border border-[#EF4444]/30',
    summary: 'Critical brand compliance risks detected. Immediate human intervention required.'
  };
}

/**
 * FEATURE 1: Brand Health Index
 * Formula:
 * Brand Health = (Average Compliance Score × 0.5) + (Resolution Rate × 0.3) + ((100 − Critical Risk Percentage) × 0.2)
 */
export function calculateBrandHealth(reviews = []) {
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    const defaultGrade = getBrandHealthGrade(100);
    return {
      score: 100,
      grade: defaultGrade.grade,
      gradeInfo: defaultGrade,
      isEmpty: true,
      totalReviews: 0,
      totalViolations: 0,
      resolvedViolations: 0,
      criticalViolations: 0,
      contributingMetrics: {
        averageComplianceScore: {
          value: 100,
          weight: 0.5,
          weightedContribution: 50,
          label: 'Average Compliance Score'
        },
        resolutionRate: {
          value: 100,
          weight: 0.3,
          weightedContribution: 30,
          label: 'Resolution Rate'
        },
        criticalRiskBuffer: {
          value: 100,
          criticalRiskPercentage: 0,
          weight: 0.2,
          weightedContribution: 20,
          label: 'Critical Risk Buffer (100 − Critical Risk %)'
        }
      }
    };
  }

  // 1. Average Compliance Score
  const scoredReviews = reviews.filter(r => typeof r.score === 'number' && !isNaN(r.score));
  const averageComplianceScore = scoredReviews.length > 0
    ? Math.round(scoredReviews.reduce((sum, r) => sum + r.score, 0) / scoredReviews.length)
    : 100;

  // 2. Resolution Rate
  let totalViolations = 0;
  let resolvedViolations = 0;
  let criticalViolations = 0;

  reviews.forEach(r => {
    const initialFindings = r.versions?.[0]?.findings || r.versions?.[0]?.violations || r.violations || r.findings || [];
    const currentFindings = r.violations || r.findings || [];

    const initialCount = initialFindings.length;
    const currentCount = currentFindings.length;

    totalViolations += initialCount;

    // Check version resolution diff
    if (r.versions && r.versions.length > 1) {
      const diff = initialCount - currentCount;
      if (diff > 0) resolvedViolations += diff;
    }

    // If review is Approved, all violations are resolved
    if (r.status === 'Approved') {
      if (!r.versions || r.versions.length <= 1) {
        resolvedViolations += initialCount;
      }
    }

    // Critical violations count
    initialFindings.forEach(v => {
      const sev = v.severity || v.priority || '';
      if (sev === 'Critical') criticalViolations += 1;
    });

    // Fallback: If no violation items but riskLevel is High
    if (initialCount === 0 && r.riskLevel === 'High') {
      criticalViolations += 1;
      totalViolations += 1;
    }
  });

  const resolutionRate = totalViolations > 0
    ? Math.min(100, Math.round((resolvedViolations / totalViolations) * 100))
    : 100;

  // 3. Critical Risk Percentage
  const criticalRiskPercentage = totalViolations > 0
    ? Math.min(100, Math.round((criticalViolations / totalViolations) * 100))
    : 0;

  const criticalRiskBuffer = Math.max(0, 100 - criticalRiskPercentage);

  // Exact Formula:
  // Brand Health = (Average Compliance Score × 0.5) + (Resolution Rate × 0.3) + ((100 − Critical Risk Percentage) × 0.2)
  const score = Math.min(100, Math.max(0, Math.round(
    (averageComplianceScore * 0.5) +
    (resolutionRate * 0.3) +
    (criticalRiskBuffer * 0.2)
  )));

  const gradeInfo = getBrandHealthGrade(score);

  return {
    score,
    grade: gradeInfo.grade,
    gradeInfo,
    isEmpty: false,
    totalReviews,
    totalViolations,
    resolvedViolations,
    criticalViolations,
    contributingMetrics: {
      averageComplianceScore: {
        value: averageComplianceScore,
        weight: 0.5,
        weightedContribution: Number((averageComplianceScore * 0.5).toFixed(1)),
        label: 'Average Compliance Score'
      },
      resolutionRate: {
        value: resolutionRate,
        weight: 0.3,
        weightedContribution: Number((resolutionRate * 0.3).toFixed(1)),
        label: 'Resolution Rate'
      },
      criticalRiskBuffer: {
        value: criticalRiskBuffer,
        criticalRiskPercentage,
        weight: 0.2,
        weightedContribution: Number((criticalRiskBuffer * 0.2).toFixed(1)),
        label: 'Critical Risk Buffer (100 − Critical Risk %)'
      }
    }
  };
}

/**
 * FEATURE 2: Visual vs Text Violation Analytics
 * Classifies violations into visual vs textual copy violations using
 * explicit metadata (isVisual, modality) and contextual classification.
 */
export function calculateVisualVsTextAnalytics(reviews = []) {
  let visualCount = 0;
  let textCount = 0;
  let visualResolved = 0;
  let textResolved = 0;

  reviews.forEach(r => {
    const isImageMode = r.submissionMode === 'image' || !!r.visualAnalysis;
    const list = r.violations || r.findings || [];

    list.forEach(v => {
      // 1. Check explicit metadata
      if (v.isVisual === true || v.modality === 'visual') {
        visualCount += 1;
        if (r.status === 'Approved') visualResolved += 1;
        return;
      }
      if (v.isVisual === false || v.modality === 'text') {
        textCount += 1;
        if (r.status === 'Approved') textResolved += 1;
        return;
      }

      // 2. Contextual classification
      const cat = (v.category || '').toLowerCase();
      const desc = (v.explanation || v.detail || '').toLowerCase();
      const rule = (v.relevantGuideline || '').toLowerCase();

      const isVisual = isImageMode ||
        cat.includes('visual') || cat.includes('color') || cat.includes('palette') ||
        cat.includes('logo') || cat.includes('typography') || cat.includes('layout') ||
        cat.includes('readability') ||
        desc.includes('hex') || desc.includes('margin') || desc.includes('clear space') ||
        desc.includes('contrast') || desc.includes('distortion') || desc.includes('swatch') ||
        rule.includes('visual') || rule.includes('color') || rule.includes('logo');

      if (isVisual) {
        visualCount += 1;
        if (r.status === 'Approved') visualResolved += 1;
      } else {
        textCount += 1;
        if (r.status === 'Approved') textResolved += 1;
      }
    });
  });

  const total = visualCount + textCount;
  const visualPercentage = total > 0 ? Math.round((visualCount / total) * 100) : 0;
  const textPercentage = total > 0 ? Math.round((textCount / total) * 100) : 0;

  return {
    visualCount,
    textCount,
    total,
    visualPercentage,
    textPercentage,
    visualResolved,
    textResolved,
    chartData: [
      {
        name: 'Visual Creative Violations',
        count: visualCount,
        percentage: visualPercentage,
        color: '#8B5CF6',
        fill: '#8B5CF6'
      },
      {
        name: 'Textual Copy Violations',
        count: textCount,
        percentage: textPercentage,
        color: '#536DFE',
        fill: '#536DFE'
      }
    ]
  };
}

/**
 * FEATURE 3: Monthly Reporting Cohorts with Month-over-Month (MoM) Changes
 * Aggregates review volume, compliance score, resolved violations, and pending violations
 * strictly by historical calendar month.
 */
export function calculateMonthlyCohorts(reviews = []) {
  if (!reviews || reviews.length === 0) return [];

  const monthMap = {};

  reviews.forEach(r => {
    // Robust date extraction from actual stored review records
    let d = null;
    if (r.createdAt && !isNaN(new Date(r.createdAt))) d = new Date(r.createdAt);
    else if (r.timestamp && !isNaN(new Date(r.timestamp))) d = new Date(r.timestamp);
    else if (r.versions?.[0]?.timestamp && !isNaN(new Date(r.versions[0].timestamp))) d = new Date(r.versions[0].timestamp);
    else if (r.auditTrail?.[0]?.timestamp && !isNaN(new Date(r.auditTrail[0].timestamp))) d = new Date(r.auditTrail[0].timestamp);
    else d = new Date();

    const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const sortDate = new Date(d.getFullYear(), d.getMonth(), 1).getTime();

    if (!monthMap[monthKey]) {
      monthMap[monthKey] = {
        month: monthKey,
        sortDate,
        reviewVolume: 0,
        scoreSum: 0,
        scoredReviewsCount: 0,
        resolvedViolations: 0,
        pendingViolations: 0,
        totalViolations: 0,
        visualViolations: 0,
        textViolations: 0
      };
    }

    const cohort = monthMap[monthKey];
    cohort.reviewVolume += 1;

    if (typeof r.score === 'number' && !isNaN(r.score)) {
      cohort.scoreSum += r.score;
      cohort.scoredReviewsCount += 1;
    }

    const findings = r.violations || r.findings || [];
    cohort.totalViolations += findings.length;

    if (r.status === 'Approved') {
      cohort.resolvedViolations += findings.length;
    } else {
      cohort.pendingViolations += findings.length;
    }

    const isImage = r.submissionMode === 'image' || !!r.visualAnalysis;
    if (isImage) {
      cohort.visualViolations += findings.length;
    } else {
      cohort.textViolations += findings.length;
    }
  });

  // Sort chronologically ascending to compute Month-over-Month changes accurately
  const sortedAscending = Object.values(monthMap).sort((a, b) => a.sortDate - b.sortDate);

  const enrichedCohorts = sortedAscending.map((cohort, idx) => {
    const averageScore = cohort.scoredReviewsCount > 0
      ? Math.round(cohort.scoreSum / cohort.scoredReviewsCount)
      : 100;

    let momVolumeDelta = null;
    let momScoreDelta = null;
    let momResolvedDelta = null;

    if (idx > 0) {
      const prev = sortedAscending[idx - 1];
      const prevAvgScore = prev.scoredReviewsCount > 0
        ? Math.round(prev.scoreSum / prev.scoredReviewsCount)
        : 100;

      momVolumeDelta = cohort.reviewVolume - prev.reviewVolume;
      momScoreDelta = averageScore - prevAvgScore;
      momResolvedDelta = cohort.resolvedViolations - prev.resolvedViolations;
    }

    return {
      month: cohort.month,
      sortDate: cohort.sortDate,
      reviewVolume: cohort.reviewVolume,
      averageScore,
      resolvedViolations: cohort.resolvedViolations,
      pendingViolations: cohort.pendingViolations,
      totalViolations: cohort.totalViolations,
      visualViolations: cohort.visualViolations,
      textViolations: cohort.textViolations,
      momVolumeDelta,
      momScoreDelta,
      momResolvedDelta
    };
  });

  // Return descending (most recent month first)
  return enrichedCohorts.sort((a, b) => b.sortDate - a.sortDate);
}
