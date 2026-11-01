import React, { useEffect, useRef } from 'react';
import { soundManager } from '../../utils/sound.js';

interface RadialTimerProps {
  remainingMs: number;
  totalDurationMs: number;
  isActive: boolean;
  size?: number; // diameter in px (default 120)
}

export const RadialTimer: React.FC<RadialTimerProps> = ({
  remainingMs,
  totalDurationMs,
  isActive,
  size = 110,
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const fraction = Math.max(0, Math.min(1, remainingMs / Math.max(1, totalDurationMs)));
  const strokeDashoffset = circumference - fraction * circumference;

  const remainingSeconds = Math.max(0, remainingMs / 1000);
  const formattedTime = remainingSeconds.toFixed(1);

  // Determine color and urgency
  const isUrgent = fraction <= 0.25 && isActive;
  const isWarning = fraction <= 0.5 && fraction > 0.25;

  const strokeColor = isUrgent
    ? '#EF4444' // Crimson
    : isWarning
    ? '#F59E0B' // Golden Amber
    : '#10B981'; // Emerald

  // Sound cues for countdown
  const prevSecondRef = useRef<number>(Math.ceil(remainingSeconds));
  useEffect(() => {
    if (!isActive) return;

    const currentCeilSec = Math.ceil(remainingSeconds);
    if (currentCeilSec !== prevSecondRef.current && remainingSeconds > 0) {
      if (currentCeilSec <= 3) {
        soundManager.playTimerUrgent();
      } else if (currentCeilSec <= 5) {
        soundManager.playTimerTick();
      }
      prevSecondRef.current = currentCeilSec;
    }
  }, [remainingSeconds, isActive]);

  return (
    <div className={`relative flex items-center justify-center select-none ${isUrgent ? 'animate-urgent' : ''}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Dynamic countdown ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-100 ease-linear"
        />
      </svg>

      {/* Center time read-out */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className={`font-mono font-extrabold tracking-tighter ${
            size > 90 ? 'text-2xl' : 'text-lg'
          } ${
            isUrgent ? 'text-rose-400' : isWarning ? 'text-amber-300' : 'text-slate-100'
          }`}
        >
          {formattedTime}
          <span className="text-xs font-semibold opacity-75">s</span>
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          {isActive ? 'Remaining' : 'Paused'}
        </span>
      </div>
    </div>
  );
};
