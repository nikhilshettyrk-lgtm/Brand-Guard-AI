import React from 'react';

/**
 * BrandHealthGauge Component
 * Renders an attractive, circular SVG gauge for the Brand Health Index (0-100),
 * complete with the required qualitative grade badge (Optimal, Stable, Guarded, Action Required).
 */
export default function BrandHealthGauge({
  score = 100,
  grade = 'Optimal',
  gradeInfo = null,
  size = 140,
  strokeWidth = 10,
  showGrade = true,
  className = ''
}) {
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const color = gradeInfo?.color || (
    normalizedScore >= 90 ? '#10B981' :
    normalizedScore >= 75 ? '#536DFE' :
    normalizedScore >= 50 ? '#F59E0B' : '#EF4444'
  );

  const badgeClass = gradeInfo?.badgeClass || (
    normalizedScore >= 90 ? 'bg-[#10B981]/15 text-[#047857] border border-[#10B981]/30' :
    normalizedScore >= 75 ? 'bg-[#536DFE]/15 text-[#536DFE] border border-[#536DFE]/30' :
    normalizedScore >= 50 ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30' :
    'bg-[#EF4444]/15 text-[#B91C1C] border border-[#EF4444]/30'
  );

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#D5DDE7"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="opacity-40"
          />
          {/* Progress Stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Metric Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold text-[#202B45] tracking-tight leading-none">
            {normalizedScore}
          </span>
          <span className="text-[10px] font-bold text-[#8A99AD] uppercase tracking-wider mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {showGrade && (
        <div className="mt-2 text-center">
          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${badgeClass}`}>
            {grade}
          </span>
        </div>
      )}
    </div>
  );
}
