import React, { useEffect, useState } from 'react';
import { Eye, Fingerprint, Radio, ShieldAlert, Skull, Sparkles, Users } from 'lucide-react';

interface ImpostorIntroOverlayProps {
  onComplete: () => void;
}

const BRIEFING_STEPS = [
  {
    code: 'SIGNAL // 01',
    title: 'AN INFILTRATOR WALKS AMONG US',
    subtitle: '3–10 Human Agents · Zero AI Bots · Zero Rank Pressure',
    body: 'Everyone receives the classified topic. One to three randomly selected agents operate blind — disguised in plain sight inside your own lobby.',
    accent: 'rose',
  },
  {
    code: 'INTEL // 02',
    title: 'SECRET WORD VS. SUBTLE HINT',
    subtitle: 'Flip Your Dossier Card Without Getting Caught',
    body: 'Crewmates receive the exact Secret Word (from Food & Pinoy Culture to Mobile Legends & Dota 2 Heroes — even Lobby Player Names). Impostors only get a cryptic Hint.',
    accent: 'emerald',
  },
  {
    code: 'VERDICT // 03',
    title: 'INTERROGATE · VOTE · EJECT',
    subtitle: 'Live Chat, Open Mic Voice & Instant Consensus',
    body: 'Blend in, spot suspicious vagueness during the Conversation Timer, hit Ready to Vote early if you are certain, and eject every Impostor before they outnumber the crew.',
    accent: 'amber',
  },
] as const;

export const ImpostorIntroOverlay: React.FC<ImpostorIntroOverlayProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < BRIEFING_STEPS.length - 1 ? prev + 1 : prev));
    }, 2900);
    return () => clearInterval(timer);
  }, []);

  const current = BRIEFING_STEPS[stepIndex];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#05060b] text-zinc-100 overflow-hidden select-none">
      {/* Ambient Spy Radar & Noir Lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-rose-600/15 blur-[130px]" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[420px] w-[420px] rounded-full bg-indigo-900/20 blur-[120px]" />

        {/* Rotating radar grid */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[540px] w-[540px] sm:h-[680px] sm:w-[680px] rounded-full border border-rose-500/10 opacity-60">
          <div className="absolute inset-12 rounded-full border border-rose-500/10" />
          <div className="absolute inset-28 rounded-full border border-rose-500/15" />
          <div
            className="animate-radar-sweep absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(244,63,94,0.16) 0deg, rgba(244,63,94,0.02) 48deg, transparent 85deg)',
            }}
          />
          <div className="animate-radar-ping absolute inset-1/4 rounded-full border border-rose-500/25" />
        </div>
      </div>

      {/* Main Classified Card */}
      <div className="relative z-10 w-full max-w-2xl mx-4 rounded-3xl border border-rose-500/25 bg-[#0b0d14]/90 backdrop-blur-xl shadow-[0_0_80px_rgba(225,29,72,0.18)] overflow-hidden animate-noir-fade-up">
        {/* Moving classified scanner beam */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-rose-500/10 to-transparent animate-classified-scan" />

        {/* Header Strip */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
            <span className="text-[11px] font-black tracking-[0.26em] uppercase text-rose-400">
              {current.code} · TOP SECRET BRIEFING
            </span>
          </div>
          <button
            onClick={onComplete}
            className="text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 transition-colors cursor-pointer"
          >
            Skip Intro
          </button>
        </div>

        {/* Visual Split Card Preview */}
        <div className="p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0 h-28 w-28 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/70 via-[#120d17] to-black flex items-center justify-center shadow-inner">
              {stepIndex === 0 && (
                <Fingerprint className="h-14 w-14 text-rose-400 animate-pulse" />
              )}
              {stepIndex === 1 && (
                <Eye className="h-14 w-14 text-emerald-400 animate-bounce" />
              )}
              {stepIndex === 2 && (
                <Skull className="h-14 w-14 text-amber-400 animate-stamp-slam" />
              )}
              <span className="absolute -bottom-2.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-[9px] font-black tracking-widest uppercase text-white shadow-lg">
                NOIR EDITION
              </span>
            </div>

            <div className="text-center sm:text-left space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                {current.subtitle}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {current.title}
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">{current.body}</p>
            </div>
          </div>

          {/* Mini Dossier Comparison Preview */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                  CREWMATE SEES
                </div>
                <div className="text-xs font-extrabold text-white truncate">
                  Secret Word: “Gusion”
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black tracking-widest text-rose-400 uppercase">
                  IMPOSTOR SEES
                </div>
                <div className="text-xs font-extrabold text-rose-200 truncate">
                  Hint: “Recalling blades...”
                </div>
              </div>
            </div>
          </div>

          {/* Step Dots + Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              {BRIEFING_STEPS.map((s, idx) => (
                <button
                  key={s.code}
                  onClick={() => setStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === stepIndex
                      ? 'w-8 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                      : 'w-2 bg-zinc-700 hover:bg-zinc-500'
                  }`}
                  aria-label={`Briefing step ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {stepIndex < BRIEFING_STEPS.length - 1 ? (
                <button
                  onClick={() => setStepIndex((prev) => prev + 1)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-zinc-200 transition-colors cursor-pointer"
                >
                  Next Intel →
                </button>
              ) : null}

              <button
                onClick={onComplete}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Enter Spy Lounge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
