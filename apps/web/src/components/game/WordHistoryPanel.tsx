import { ArrowDown, CheckCircle2, History } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface WordHistoryPanelProps {
  wordHistory: string[];
  roundNumber?: number;
  className?: string;
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

export const WordHistoryPanel: React.FC<WordHistoryPanelProps> = ({
  wordHistory,
  roundNumber,
  className = '',
  isMobileDrawer = false,
  onClose,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest word whenever a new word is added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [wordHistory.length]);

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 backdrop-blur-md shadow-2xl flex flex-col h-full overflow-hidden ${className}`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-200 tracking-wide uppercase">
              Chain History
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              {roundNumber ? `Round ${roundNumber} • ` : ''}All match words
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700/60 shadow-inner">
            {wordHistory.length} {wordHistory.length === 1 ? 'word' : 'words'}
          </span>
          {isMobileDrawer && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-mono px-2"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Word History List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-[140px]"
      >
        {wordHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs font-mono">
            <span>No words chained yet</span>
            <span className="text-[10px] text-slate-600 mt-1">Starting word will appear here</span>
          </div>
        ) : (
          wordHistory.map((word, index) => {
            const isLatest = index === wordHistory.length - 1;
            const isSeed = index === 0;

            return (
              <React.Fragment key={`history-word-${index}-${word}`}>
                {/* Connector Arrow between consecutive words */}
                {index > 0 && (
                  <div className="flex items-center justify-center py-0.5 text-slate-600">
                    <ArrowDown className="w-3 h-3 text-slate-600/70" />
                  </div>
                )}

                {/* Word Item Card */}
                <div
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl transition-all border font-mono ${
                    isLatest
                      ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border-cyan-400/60 ring-1 ring-cyan-400/30 text-white shadow-glow'
                      : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-800/80 text-slate-300'
                  }`}
                >
                  {/* Left: Index badge & Word text */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        isLatest
                          ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      #{index + 1}
                    </span>

                    <span className="font-black text-sm tracking-wide truncate">
                      {word.toUpperCase()}
                    </span>
                  </div>

                  {/* Right: Badges & metadata */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isSeed ? (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                        SEED
                      </span>
                    ) : isLatest ? (
                      <span className="flex items-center gap-1 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 font-bold animate-pulse">
                        <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />
                        LATEST
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">
                        {word.length}L
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Footer metadata */}
      <div className="pt-2 mt-2 border-t border-slate-800/70 flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0">
        <span>No repeat words</span>
        <span>Auto-syncs live</span>
      </div>
    </div>
  );
};
