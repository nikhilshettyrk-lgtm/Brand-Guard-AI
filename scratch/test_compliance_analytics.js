import {
  calculateBrandHealth,
  getBrandHealthGrade,
  calculateVisualVsTextAnalytics,
  calculateMonthlyCohorts
} from '../src/utils/complianceAnalytics.js';

console.log('--- TEST 1: Grade Boundaries ---');
console.assert(getBrandHealthGrade(95).grade === 'Optimal', '95 should be Optimal');
console.assert(getBrandHealthGrade(90).grade === 'Optimal', '90 should be Optimal');
console.assert(getBrandHealthGrade(85).grade === 'Stable', '85 should be Stable');
console.assert(getBrandHealthGrade(75).grade === 'Stable', '75 should be Stable');
console.assert(getBrandHealthGrade(74).grade === 'Guarded', '74 should be Guarded');
console.assert(getBrandHealthGrade(50).grade === 'Guarded', '50 should be Guarded');
console.assert(getBrandHealthGrade(49).grade === 'Action Required', '49 should be Action Required');
console.assert(getBrandHealthGrade(20).grade === 'Action Required', '20 should be Action Required');
console.log('✓ Grade boundaries passed');

console.log('\n--- TEST 2: Brand Health Formula ---');
// Formula: (Avg Score * 0.5) + (Resolution Rate * 0.3) + ((100 - Critical Risk %) * 0.2)
// Sample: 2 reviews.
// Review 1: score 80, 2 violations (1 Critical, 1 Medium), Approved (so resolved)
// Review 2: score 90, 0 violations, Pending
// Avg Score = (80 + 90) / 2 = 85. Contribution: 85 * 0.5 = 42.5
// Total Violations = 2, Resolved = 2 -> Resolution Rate = 100%. Contribution: 100 * 0.3 = 30
// Critical Violations = 1 out of 2 = 50% -> Buffer = 100 - 50 = 50%. Contribution: 50 * 0.2 = 10
// Expected Brand Health = 42.5 + 30 + 10 = 82.5 -> round to 83. Grade: Stable (75-89)
const testReviews = [
  {
    id: 'rev-1',
    score: 80,
    status: 'Approved',
    violations: [
      { id: 'v1', severity: 'Critical', category: 'Logo Clear Space', isVisual: true },
      { id: 'v2', severity: 'Medium', category: 'Tone of Voice', isVisual: false }
    ],
    timestamp: '2026-03-05T10:00:00Z'
  },
  {
    id: 'rev-2',
    score: 90,
    status: 'Pending',
    violations: [],
    timestamp: '2026-04-10T10:00:00Z'
  }
];

const health = calculateBrandHealth(testReviews);
console.log('Calculated Health:', health);
console.assert(health.score === 83, `Expected 83, got ${health.score}`);
console.assert(health.grade === 'Stable', `Expected Stable, got ${health.grade}`);
console.assert(health.contributingMetrics.averageComplianceScore.value === 85, 'Avg score mismatch');
console.assert(health.contributingMetrics.resolutionRate.value === 100, 'Resolution rate mismatch');
console.assert(health.contributingMetrics.criticalRiskBuffer.value === 50, 'Critical risk buffer mismatch');
console.log('✓ Brand Health Formula passed');

console.log('\n--- TEST 3: Visual vs Text Violation Segmentation ---');
const vVsT = calculateVisualVsTextAnalytics(testReviews);
console.log('Visual vs Text Analytics:', vVsT);
console.assert(vVsT.visualCount === 1, `Expected 1 visual, got ${vVsT.visualCount}`);
console.assert(vVsT.textCount === 1, `Expected 1 text, got ${vVsT.textCount}`);
console.assert(vVsT.total === 2, `Expected total 2, got ${vVsT.total}`);
console.assert(vVsT.visualPercentage === 50, `Expected 50%, got ${vVsT.visualPercentage}`);
console.assert(vVsT.textPercentage === 50, `Expected 50%, got ${vVsT.textPercentage}`);
console.log('✓ Visual vs Text Violation Segmentation passed');

console.log('\n--- TEST 4: Monthly Reporting Cohorts & MoM Deltas ---');
const cohorts = calculateMonthlyCohorts(testReviews);
console.log('Monthly Cohorts:', cohorts);
console.assert(cohorts.length === 2, `Expected 2 months, got ${cohorts.length}`);
// Chronologically: Mar 2026 was index 0, Apr 2026 was index 1.
// Descending output: Apr 2026 first, Mar 2026 second.
const aprCohort = cohorts[0];
const marCohort = cohorts[1];
console.assert(aprCohort.month.includes('Apr'), 'First cohort should be April');
console.assert(marCohort.month.includes('Mar'), 'Second cohort should be March');
// Apr vs Mar:
// Apr volume: 1, Mar volume: 1 -> MoM volume delta = 0
// Apr avg score: 90, Mar avg score: 80 -> MoM score delta = +10
console.assert(aprCohort.momVolumeDelta === 0, `Expected 0 volume delta, got ${aprCohort.momVolumeDelta}`);
console.assert(aprCohort.momScoreDelta === 10, `Expected +10 score delta, got ${aprCohort.momScoreDelta}`);
console.log('✓ Monthly Reporting Cohorts & MoM Deltas passed');

console.log('\n--- TEST 5: Empty Reviews Graceful Handling ---');
const emptyHealth = calculateBrandHealth([]);
console.assert(emptyHealth.score === 100, 'Empty health should default to 100');
console.assert(emptyHealth.grade === 'Optimal', 'Empty health grade should be Optimal');
const emptyCohorts = calculateMonthlyCohorts([]);
console.assert(Array.isArray(emptyCohorts) && emptyCohorts.length === 0, 'Empty cohorts should be empty array');
const emptyVVsT = calculateVisualVsTextAnalytics([]);
console.assert(emptyVVsT.total === 0, 'Empty visual vs text total should be 0');
console.log('✓ Empty Reviews Graceful Handling passed');

console.log('\nALL 5 COMPLIANCE ANALYTICS TESTS PASSED SUCCESSFULLY!');
