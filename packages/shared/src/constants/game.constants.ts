import { ChessSeatMeta, ChessVariant } from '../types/chess.types.js';
import { MathDifficulty, MathDifficultyConfig } from '../types/math.types.js';
import { AcademicRankTier } from '../types/ranking.types.js';
import { ACADEMIC_RANK_TIERS } from './ranks.constants.js';

export const WORD_MIN_LENGTH = 3;
export const WORD_MAX_LENGTH = 46;

export const RECONNECT_GRACE_PERIOD_MS = 25_000; // 25s window for casual
export const RANKED_RECONNECT_GRACE_MS = 15_000; // 15s window for ranked

export const SUBMISSION_COOLDOWN_MS = 400; // 400ms throttle after invalid word
export const MAX_REJECTIONS_PER_TURN = 4; // 5th attempt triggers rate limit

export const DIFFICULTY_PRESETS = {
  RELAXED: {
    startTimerSec: 20,
    minTimerSec: 10,
    decrementPerRoundSec: 0.5,
  },
  CLASSIC: {
    startTimerSec: 15,
    minTimerSec: 6,
    decrementPerRoundSec: 0.5,
  },
  EXPERT: {
    startTimerSec: 10,
    minTimerSec: 5,
    decrementPerRoundSec: 0.5,
  },
} as const;

export const HIGH_FREQUENCY_LETTERS = ['A', 'C', 'D', 'E', 'M', 'P', 'R', 'S', 'T'];

export const INITIAL_SEED_WORDS = [
  'PLANET',
  'GALAXY',
  'BRIDGE',
  'SPRING',
  'CASTLE',
  'STREAM',
  'FOREST',
  'SHADOW',
  'SILVER',
  'WONDER',
  'ORANGE',
  'WIZARD',
];

export const TAGALOG_SEED_WORDS = [
  'BAYANI',
  'PAGIBIG',
  'KAPATID',
  'SAMPAGUITA',
  'PILIPINAS',
  'LIGAYA',
  'PANGARAP',
  'KULAY',
  'LIWANAG',
  'HANGIN',
  'BITUIN',
  'DAGAT',
];

export const BISAYA_SEED_WORDS = [
  'SUGBO',
  'DAGHAN',
  'IGSOON',
  'KASINGKASING',
  'PAGLAUM',
  'KINABUHI',
  'KALIPAY',
  'KUSOG',
  'HAYAG',
  'BITUON',
  'PANGANOD',
  'PULONG',
];

export const MATH_TOTAL_ROUNDS = 10;
export const MATH_PICK_DURATION_SEC = 3;
export const MATH_RACE_DURATION_SEC = 60;
export const MATH_ROUND_RESULT_DELAY_MS = 2800;
export const MATH_PICK_OPTION_COUNT = 12;
export const MATH_PLACEMENT_POINTS = [100, 75, 60, 45, 35, 25] as const;

export const DEFAULT_MATH_DIFFICULTY: MathDifficulty = 'EASY';

export const MATH_DIFFICULTY_ORDER: MathDifficulty[] = [
  'EASY',
  'CHALLENGE',
  'EXPERT',
  'MATHEMATICIAN',
  'MATH_GOD',
];

export const MATH_DIFFICULTY_CONFIGS: Record<MathDifficulty, MathDifficultyConfig> = {
  EASY: {
    id: 'EASY',
    label: 'Easy',
    minNumber: 1,
    maxNumber: 9,
    optionCount: 9,
    description: 'Numbers 1–9',
  },
  CHALLENGE: {
    id: 'CHALLENGE',
    label: 'Challenge',
    minNumber: 1,
    maxNumber: 20,
    optionCount: 12,
    description: 'Numbers 1–20',
  },
  EXPERT: {
    id: 'EXPERT',
    label: 'Expert',
    minNumber: 1,
    maxNumber: 50,
    optionCount: 12,
    description: 'Numbers 1–50',
  },
  MATHEMATICIAN: {
    id: 'MATHEMATICIAN',
    label: 'Mathematician',
    minNumber: 1,
    maxNumber: 70,
    optionCount: 12,
    description: 'Numbers 1–70',
  },
  MATH_GOD: {
    id: 'MATH_GOD',
    label: 'Math-God',
    minNumber: 1,
    maxNumber: 200,
    optionCount: 12,
    description: 'Numbers 1–200',
  },
};

export function getMathDifficultyForRankTier(tier: AcademicRankTier): MathDifficulty {
  const idx = ACADEMIC_RANK_TIERS.indexOf(tier);
  if (idx >= 9) return 'MATH_GOD';
  if (idx >= 6) return 'MATHEMATICIAN';
  if (idx >= 4) return 'EXPERT';
  if (idx >= 2) return 'CHALLENGE';
  return 'EASY';
}

export function getMathDifficultyForTiers(tiers: AcademicRankTier[]): MathDifficulty {
  if (!tiers.length) return DEFAULT_MATH_DIFFICULTY;
  const totalIdx = tiers.reduce((sum, t) => sum + Math.max(0, ACADEMIC_RANK_TIERS.indexOf(t)), 0);
  const avgIdx = Math.round(totalIdx / tiers.length);
  const avgTier = ACADEMIC_RANK_TIERS[Math.min(ACADEMIC_RANK_TIERS.length - 1, Math.max(0, avgIdx))];
  return getMathDifficultyForRankTier(avgTier);
}

export const CHESS_DEFAULT_CLOCK_SEC = 300;
export const CHESS_DEFAULT_INCREMENT_SEC = 3;
export const CHESS_CLOCK_PRESETS_SEC = [180, 300, 600] as const;
export const CHESS_INCREMENT_PRESETS_SEC = [0, 3, 5] as const;

export const CHESS_VARIANT_LABELS: Record<ChessVariant, string> = {
  '2P': '2-Player Classic (8×8)',
  '3P': '3-Player Hex (96 Squares)',
  '4P': '4-Player Cross (14×14)',
};

export const CHESS_SEAT_META: Record<ChessVariant, ChessSeatMeta[]> = {
  '2P': [
    {
      seat: 0,
      color: 'WHITE',
      label: 'White',
      fillHex: '#F8FAFC',
      strokeHex: '#1E293B',
      textHex: '#0F172A',
      perspectiveDeg: 0,
    },
    {
      seat: 1,
      color: 'BLACK',
      label: 'Black',
      fillHex: '#1E293B',
      strokeHex: '#CBD5E1',
      textHex: '#F8FAFC',
      perspectiveDeg: 180,
    },
  ],
  '3P': [
    {
      seat: 0,
      color: 'WHITE',
      label: 'White',
      fillHex: '#F8FAFC',
      strokeHex: '#1E293B',
      textHex: '#0F172A',
      perspectiveDeg: 0,
    },
    {
      seat: 1,
      color: 'BLACK',
      label: 'Black',
      fillHex: '#1E293B',
      strokeHex: '#CBD5E1',
      textHex: '#F8FAFC',
      perspectiveDeg: -120,
    },
    {
      seat: 2,
      color: 'RED',
      label: 'Red',
      fillHex: '#EF4444',
      strokeHex: '#450A0A',
      textHex: '#FEF2F2',
      perspectiveDeg: 120,
    },
  ],
  '4P': [
    {
      seat: 0,
      color: 'YELLOW',
      label: 'Yellow',
      fillHex: '#FACC15',
      strokeHex: '#713F12',
      textHex: '#422006',
      perspectiveDeg: 0,
    },
    {
      seat: 1,
      color: 'BLUE',
      label: 'Blue',
      fillHex: '#3B82F6',
      strokeHex: '#172554',
      textHex: '#EFF6FF',
      perspectiveDeg: -90,
    },
    {
      seat: 2,
      color: 'RED',
      label: 'Red',
      fillHex: '#EF4444',
      strokeHex: '#450A0A',
      textHex: '#FEF2F2',
      perspectiveDeg: 180,
    },
    {
      seat: 3,
      color: 'GREEN',
      label: 'Green',
      fillHex: '#22C55E',
      strokeHex: '#052E16',
      textHex: '#F0FDF4',
      perspectiveDeg: 90,
    },
  ],
};

