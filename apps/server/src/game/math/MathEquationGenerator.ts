import {
  MATH_PICK_OPTION_COUNT,
  MATH_TOTAL_ROUNDS,
  MathOperation,
  MathOperationMode,
  MathPlayerPickDisplay,
} from '@wordchain/shared';

export interface GeneratedEquation {
  operation: MathOperation;
  equationDisplay: string;
  correctAnswer: string;
  choices?: string[];
}

export class MathEquationGenerator {
  private static shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Generates `count` unique random numbers between 1 and 99 inclusive.
   */
  public static generatePickOptions(count: number = MATH_PICK_OPTION_COUNT): number[] {
    const picked = new Set<number>();
    while (picked.size < count) {
      picked.add(1 + Math.floor(Math.random() * 99));
    }
    return this.shuffle(Array.from(picked));
  }

  /**
   * Generates a balanced 10-round operation schedule.
   */
  public static buildOperationSchedule(
    mode: MathOperationMode = 'MIXED',
    totalRounds: number = MATH_TOTAL_ROUNDS
  ): MathOperation[] {
    if (mode !== 'MIXED') {
      return Array.from({ length: totalRounds }, () => mode);
    }

    const baseOps: MathOperation[] = ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'];
    const schedule: MathOperation[] = [];
    for (let i = 0; i < totalRounds; i++) {
      schedule.push(baseOps[i % baseOps.length]);
    }
    return this.shuffle(schedule);
  }

  /**
   * Formats a division numeric value rounded up to 2 decimal places without trailing zeros.
   */
  public static formatDivisionValue(val: number): string {
    const rounded = Math.round(val * 100) / 100;
    if (Number.isInteger(rounded) || Object.is(rounded, -0)) {
      return String(rounded === 0 ? 0 : rounded);
    }
    return rounded.toFixed(2).replace(/0$/, '');
  }

  /**
   * Generates 4 distinct realistic choices (always including `correctAnswer`) for Division.
   */
  public static generateDivisionChoices(rawVal: number): { correctAnswer: string; choices: string[] } {
    const roundedCorrect = Math.round(rawVal * 100) / 100;
    const correctAnswer = this.formatDivisionValue(roundedCorrect);
    const isWhole = Number.isInteger(roundedCorrect);

    const candidateSet = new Set<string>([correctAnswer]);

    const integerOffsets = [-3, -2, -1, 1, 2, 3, 4, -4, 5, 10, -5];
    const decimalOffsets = [-1.5, -1.25, -0.75, -0.5, -0.33, -0.25, -0.15, 0.15, 0.25, 0.33, 0.5, 0.75, 1.25, 1.5, 2.25];
    const offsets = this.shuffle(isWhole ? integerOffsets : decimalOffsets);

    for (const delta of offsets) {
      if (candidateSet.size >= 4) break;
      const cand = roundedCorrect + delta;
      if (cand <= 0) continue;
      const formatted = this.formatDivisionValue(cand);
      candidateSet.add(formatted);
    }

    // Deterministic positive fallback if small numbers constrained offsets
    let step = isWhole ? 1 : 0.35;
    while (candidateSet.size < 4) {
      const cand = roundedCorrect + step;
      candidateSet.add(this.formatDivisionValue(cand));
      step += isWhole ? 1 : 0.45;
    }

    return {
      correctAnswer,
      choices: this.shuffle(Array.from(candidateSet).slice(0, 4)),
    };
  }

  /**
   * Builds the multiplayer math problem from all players' chosen numbers.
   */
  public static buildEquation(
    picks: MathPlayerPickDisplay[],
    operation: MathOperation
  ): GeneratedEquation {
    const nums = picks.map((p) => p.number);
    if (nums.length < 2) {
      throw new Error('At least 2 picked numbers are required to generate an equation.');
    }

    if (operation === 'ADD') {
      const total = nums.reduce((acc, n) => acc + n, 0);
      return {
        operation,
        equationDisplay: `${nums.join(' + ')} = ?`,
        correctAnswer: String(total),
      };
    }

    if (operation === 'SUBTRACT') {
      const diff = nums.slice(1).reduce((acc, n) => acc - n, nums[0]);
      return {
        operation,
        equationDisplay: `${nums.join(' - ')} = ?`,
        correctAnswer: String(diff),
      };
    }

    if (operation === 'MULTIPLY') {
      if (nums.length === 2) {
        return {
          operation,
          equationDisplay: `${nums[0]} × ${nums[1]} = ?`,
          correctAnswer: String(nums[0] * nums[1]),
        };
      }
      const head = nums.slice(0, -1);
      const tail = nums[nums.length - 1];
      const headSum = head.reduce((acc, n) => acc + n, 0);
      return {
        operation,
        equationDisplay: `(${head.join(' + ')}) × ${tail} = ?`,
        correctAnswer: String(headSum * tail),
      };
    }

    // DIVIDE -> 4 multiple-choice options
    let rawVal: number;
    let equationDisplay: string;
    if (nums.length === 2) {
      rawVal = nums[0] / nums[1];
      equationDisplay = `${nums[0]} ÷ ${nums[1]} = ?`;
    } else {
      const head = nums.slice(0, -1);
      const tail = nums[nums.length - 1];
      const headSum = head.reduce((acc, n) => acc + n, 0);
      rawVal = headSum / tail;
      equationDisplay = `(${head.join(' + ')}) ÷ ${tail} = ?`;
    }

    const { correctAnswer, choices } = this.generateDivisionChoices(rawVal);
    return {
      operation,
      equationDisplay,
      correctAnswer,
      choices,
    };
  }

  /**
   * Validates player answer against authoritative solution.
   */
  public static isAnswerCorrect(
    rawInput: string,
    correctAnswer: string,
    operation: MathOperation
  ): boolean {
    if (typeof rawInput !== 'string') return false;
    const trimmed = rawInput.trim();
    if (!trimmed) return false;

    if (operation === 'DIVIDE') {
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) return trimmed === correctAnswer;
      return this.formatDivisionValue(parsed) === correctAnswer;
    }

    if (!/^[+-]?\d+$/.test(trimmed)) return false;
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) return false;
    return String(parsed === 0 ? 0 : parsed) === correctAnswer;
  }
}
