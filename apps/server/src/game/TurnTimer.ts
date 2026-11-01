export interface TurnTimerOptions {
  durationMs: number;
  gracePeriodMs?: number; // Network buffer (e.g., 400ms)
  onTick?: (remainingMs: number) => void;
  onTimeout: () => void;
}

export class TurnTimer {
  private durationMs: number;
  private gracePeriodMs: number;
  private onTick?: (remainingMs: number) => void;
  private onTimeout: () => void;

  private startTimeUtc: number = 0;
  private deadlineUtc: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(options: TurnTimerOptions) {
    this.durationMs = options.durationMs;
    this.gracePeriodMs = options.gracePeriodMs ?? 400;
    this.onTick = options.onTick;
    this.onTimeout = options.onTimeout;
  }

  public start(): void {
    this.stop();

    const now = Date.now();
    this.startTimeUtc = now;
    this.deadlineUtc = now + this.durationMs;
    this.isRunning = true;

    // High precision timeout with grace buffer
    const totalWaitMs = this.durationMs + this.gracePeriodMs;
    this.timeoutTimer = setTimeout(() => {
      if (this.isRunning) {
        this.stop();
        this.onTimeout();
      }
    }, totalWaitMs);

    // Optional 100ms periodic tick callback
    if (this.onTick) {
      this.timerInterval = setInterval(() => {
        if (!this.isRunning) return;
        const currentRemaining = Math.max(0, this.deadlineUtc - Date.now());
        this.onTick?.(currentRemaining);
      }, 100);
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public isExpired(): boolean {
    if (!this.isRunning) return true;
    return Date.now() > this.deadlineUtc + this.gracePeriodMs;
  }

  public getRemainingMs(): number {
    if (!this.isRunning) return 0;
    return Math.max(0, this.deadlineUtc - Date.now());
  }

  public getDeadlineUtc(): number {
    return this.deadlineUtc;
  }

  public getDurationMs(): number {
    return this.durationMs;
  }
}
