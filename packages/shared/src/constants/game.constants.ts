export const WORD_MIN_LENGTH = 3;
export const WORD_MAX_LENGTH = 25;

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
