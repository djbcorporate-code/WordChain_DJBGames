import { AcademicRankTier, RankTierConfig, ScientistDistinction } from '../types/ranking.types.js';

export const ACADEMIC_RANK_TIERS: AcademicRankTier[] = [
  'NURSERY',
  'KINDER',
  'GRADER',
  'HIGH_SCHOOL',
  'UNDERGRAD',
  'CUM_LAUDE',
  'MAGNA_CUM_LAUDE',
  'SUMMA_CUM_LAUDE',
  'MASTERAL',
  'DOCTORATE',
  'SCIENTIST',
];

export const RANK_TIER_CONFIGS: Record<AcademicRankTier, RankTierConfig> = {
  NURSERY: {
    tier: 'NURSERY',
    displayName: 'Nursery',
    divisions: 3,
    expPerDivision: 50,
    demotionProtected: true,
    color: '#38BDF8', // Sky
    badgeIcon: 'nursery-rattle',
  },
  KINDER: {
    tier: 'KINDER',
    displayName: 'Kinder',
    divisions: 3,
    expPerDivision: 50,
    demotionProtected: true,
    color: '#34D399', // Emerald
    badgeIcon: 'kinder-crayon',
  },
  GRADER: {
    tier: 'GRADER',
    displayName: 'Grader',
    divisions: 4,
    expPerDivision: 75,
    demotionProtected: false,
    color: '#FBBF24', // Amber
    badgeIcon: 'grader-backpack',
  },
  HIGH_SCHOOL: {
    tier: 'HIGH_SCHOOL',
    displayName: 'High School',
    divisions: 4,
    expPerDivision: 75,
    demotionProtected: false,
    color: '#FB923C', // Orange
    badgeIcon: 'highschool-book',
  },
  UNDERGRAD: {
    tier: 'UNDERGRAD',
    displayName: 'Undergrad',
    divisions: 4,
    expPerDivision: 100,
    demotionProtected: false,
    color: '#818CF8', // Indigo
    badgeIcon: 'undergrad-cap',
  },
  CUM_LAUDE: {
    tier: 'CUM_LAUDE',
    displayName: 'Cum Laude',
    divisions: 5,
    expPerDivision: 100,
    demotionProtected: false,
    color: '#A855F7', // Purple
    badgeIcon: 'cumlaude-medal',
  },
  MAGNA_CUM_LAUDE: {
    tier: 'MAGNA_CUM_LAUDE',
    displayName: 'Magna Cum Laude',
    divisions: 5,
    expPerDivision: 100,
    demotionProtected: false,
    color: '#EC4899', // Pink
    badgeIcon: 'magnacumlaude-ribbon',
  },
  SUMMA_CUM_LAUDE: {
    tier: 'SUMMA_CUM_LAUDE',
    displayName: 'Summa Cum Laude',
    divisions: 5,
    expPerDivision: 100,
    demotionProtected: false,
    color: '#F43F5E', // Rose
    badgeIcon: 'summacumlaude-trophy',
  },
  MASTERAL: {
    tier: 'MASTERAL',
    displayName: 'Masteral',
    divisions: 5,
    expPerDivision: 100,
    demotionProtected: false,
    color: '#06B6D4', // Cyan
    badgeIcon: 'masteral-scroll',
  },
  DOCTORATE: {
    tier: 'DOCTORATE',
    displayName: 'Doctorate',
    divisions: 5,
    expPerDivision: 100,
    demotionProtected: false,
    color: '#EAB308', // Gold
    badgeIcon: 'doctorate-crest',
  },
  SCIENTIST: {
    tier: 'SCIENTIST',
    displayName: 'Scientist',
    divisions: 0,
    expPerDivision: 0,
    demotionProtected: false,
    color: '#10B981', // Quantum Emerald
    badgeIcon: 'scientist-atom',
  },
};

export const SCIENTIST_DISTINCTIONS: Record<ScientistDistinction, { minPoints: number; displayName: string }> = {
  SCIENTIST: { minPoints: 0, displayName: 'Scientist' },
  LEAD_SCIENTIST: { minPoints: 25, displayName: 'Lead Scientist' },
  PRINCIPAL_SCIENTIST: { minPoints: 50, displayName: 'Principal Scientist' },
  CHIEF_SCIENTIST: { minPoints: 100, displayName: 'Chief Scientist' },
};

export function getScientistDistinction(points: number): ScientistDistinction {
  if (points >= 100) return 'CHIEF_SCIENTIST';
  if (points >= 50) return 'PRINCIPAL_SCIENTIST';
  if (points >= 25) return 'LEAD_SCIENTIST';
  return 'SCIENTIST';
}
