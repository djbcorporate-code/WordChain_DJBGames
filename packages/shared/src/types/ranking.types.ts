export type AcademicRankTier =
  | 'NURSERY'
  | 'KINDER'
  | 'GRADER'
  | 'HIGH_SCHOOL'
  | 'UNDERGRAD'
  | 'CUM_LAUDE'
  | 'MAGNA_CUM_LAUDE'
  | 'SUMMA_CUM_LAUDE'
  | 'MASTERAL'
  | 'DOCTORATE'
  | 'SCIENTIST';

export type ScientistDistinction =
  | 'SCIENTIST'
  | 'LEAD_SCIENTIST'
  | 'PRINCIPAL_SCIENTIST'
  | 'CHIEF_SCIENTIST';

export interface RankTierConfig {
  tier: AcademicRankTier;
  displayName: string;
  divisions: number; // 3 for Nursery/Kinder, 4 for Grader/HighSchool/Undergrad, 5 for Honors/Degrees, 0 for Scientist
  expPerDivision: number;
  demotionProtected: boolean;
  color: string;
  badgeIcon: string;
}

export interface PlayerRankProfile {
  userId: string;
  seasonId: number;
  tier: AcademicRankTier;
  division: number; // 1-indexed (e.g. 3, 2, 1)
  rankExp: number;
  scientistPoints: number;
  highestTier: AcademicRankTier;
  highestScientistPoints: number;
  hiddenMmr: number;
  seasonMatches: number;
  seasonWins: number;
  updatedAt: string;
}

export interface RankProgressionDelta {
  previousTier: AcademicRankTier;
  previousDivision: number;
  previousExp: number;
  previousScientistPoints: number;
  newTier: AcademicRankTier;
  newDivision: number;
  newExp: number;
  newScientistPoints: number;
  expChange: number;
  pointsChange: number;
  promoted: boolean;
  demoted: boolean;
}
