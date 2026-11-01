import { Eye, LogOut, Users } from 'lucide-react';
import React from 'react';

interface SpectatorOverlayProps {
  aliveCount: number;
  totalPlayers: number;
  roundNumber: number;
  onLeaveMatch: () => void;
}

export const SpectatorOverlay: React.FC<SpectatorOverlayProps> = ({
  aliveCount,
  totalPlayers,
  roundNumber,
  onLeaveMatch,
}) => {
  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-accent-secondary">
          <Eye className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            Spectator View
            <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Round {roundNumber}
            </span>
          </h4>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{aliveCount} of {totalPlayers} scholars still active</span>
          </p>
        </div>
      </div>

      <button
        onClick={onLeaveMatch}
        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Return to Dashboard</span>
      </button>
    </div>
  );
};
