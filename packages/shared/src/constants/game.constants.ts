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
export const MATH_RACE_DURATION_SEC = 15;
export const MATH_ROUND_RESULT_DELAY_MS = 2800;
export const MATH_PICK_OPTION_COUNT = 12;
export const MATH_PLACEMENT_POINTS = [100, 75, 60, 45, 35, 25] as const;

