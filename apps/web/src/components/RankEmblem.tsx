import { AcademicRankTier, RANK_TIER_CONFIGS, getScientistDistinction } from '@wordchain/shared';
import { Award, Baby, BookOpen, Crown, GraduationCap, Medal, Microscope, School, ScrollText, Trophy } from 'lucide-react';
import React from 'react';

interface RankEmblemProps {
  tier: AcademicRankTier;
  division?: number;
  scientistPoints?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const tierIcons: Record<AcademicRankTier, React.ReactNode> = {
  NURSERY: <Baby className="w-full h-full text-sky-400" />,
  KINDER: <School className="w-full h-full text-emerald-400" />,
  GRADER: <BookOpen className="w-full h-full text-amber-400" />,
  HIGH_SCHOOL: <ScrollText className="w-full h-full text-orange-400" />,
  UNDERGRAD: <GraduationCap className="w-full h-full text-indigo-400" />,
  CUM_LAUDE: <Medal className="w-full h-full text-purple-400" />,
  MAGNA_CUM_LAUDE: <Award className="w-full h-full text-pink-400" />,
  SUMMA_CUM_LAUDE: <Trophy className="w-full h-full text-rose-400" />,
  MASTERAL: <ScrollText className="w-full h-full text-cyan-400" />,
  DOCTORATE: <Crown className="w-full h-full text-yellow-400" />,
  SCIENTIST: <Microscope className="w-full h-full text-emerald-400" />,
};

const romanNumerals: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
};

export const RankEmblem: React.FC<RankEmblemProps> = ({
  tier,
  division = 1,
  scientistPoints = 0,
  size = 'md',
  showLabel = true,
}) => {
  const config = RANK_TIER_CONFIGS[tier];
  const isScientist = tier === 'SCIENTIST';
  const scientistDistinction = isScientist ? getScientistDistinction(scientistPoints) : null;

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  }[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`relative flex items-center justify-center rounded-xl bg-slate-900/90 border ${sizeClasses} shadow-lg transition-transform hover:scale-105`}
        style={{ borderColor: config.color, boxShadow: `0 0 15px -3px ${config.color}40` }}
      >
        <div className={iconSizes}>{tierIcons[tier]}</div>
        {!isScientist && division && (
          <span className="absolute -bottom-1 -right-1 px-1 rounded bg-slate-950 border border-slate-700 text-[10px] font-bold text-slate-200 leading-tight">
            {romanNumerals[division] || division}
          </span>
        )}
      </div>

      {showLabel && (
        <div className="flex flex-col">
          <span className="font-bold tracking-wide leading-none text-slate-100 flex items-center gap-1.5">
            {config.displayName}
            {!isScientist && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {romanNumerals[division]}
              </span>
            )}
          </span>
          {isScientist && (
            <span className="text-xs font-mono font-semibold text-emerald-400">
              {scientistDistinction?.replace('_', ' ')} • {scientistPoints} SP
            </span>
          )}
        </div>
      )}
    </div>
  );
};
