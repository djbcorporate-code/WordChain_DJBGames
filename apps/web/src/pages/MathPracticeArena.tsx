import {
  MATH_PICK_DURATION_SEC,
  MATH_PLACEMENT_POINTS,
  MATH_RACE_DURATION_SEC,
  MATH_TOTAL_ROUNDS,
  MathOperation,
  MathOperationMode,
} from '@wordchain/shared';
import {
  ArrowLeft,
  Bot,
  Calculator,
  CheckCircle2,
  Clock,
  Crown,
  Divide,
  Lock,
  Play,
  RotateCcw,
  Send,
  Trophy,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '../utils/sound.js';

interface MathPracticeArenaProps {
  onExit: () => void;
}

interface PracticePlayer {
  id: string;
  name: string;
  isBot: boolean;
  score: number;
  pickedNumber?: number;
  roundPlacement?: number;
  roundPoints?: number;
  lockedOut: boolean;
  solved: boolean;
}

type PracticePhase = 'SETUP' | 'PICKING' | 'RACING' | 'ROUND_RESULT' | 'FINISHED';

const OPS_CYCLE: MathOperation[] = [
  'ADD',
  'SUBTRACT',
  'MULTIPLY',
  'DIVIDE',
  'ADD',
  'SUBTRACT',
  'MULTIPLY',
  'DIVIDE',
  'MULTIPLY',
  'DIVIDE',
];

function generate12RandomNumbers(): number[] {
  const pool = Array.from({ length: 99 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 12).sort((a, b) => a - b);
}

function formatDiv(val: number): string {
  const rounded = Math.round(val * 100) / 100;
  return Object.is(rounded, -0) ? '0' : Number(rounded.toFixed(2)).toString();
}

function buildPracticeProblem(
  picks: { name: string; num: number }[],
  op: MathOperation
): { equation: string; correctAnswer: string; choices?: string[] } {
  const nums = picks.map((p) => p.num);
  if (op === 'ADD') {
    const sum = nums.reduce((a, b) => a + b, 0);
    return { equation: `${nums.join(' + ')} = ?`, correctAnswer: String(sum) };
  }
  if (op === 'SUBTRACT') {
    const res = nums.slice(1).reduce((a, b) => a - b, nums[0]);
    return { equation: `${nums.join(' - ')} = ?`, correctAnswer: String(res) };
  }

  const headSum = nums.slice(0, -1).reduce((a, b) => a + b, 0);
  const tail = nums[nums.length - 1];
  const leftExpr = nums.length === 2 ? `${headSum}` : `(${nums.slice(0, -1).join(' + ')})`;

  if (op === 'MULTIPLY') {
    return { equation: `${leftExpr} × ${tail} = ?`, correctAnswer: String(headSum * tail) };
  }

  const val = headSum / tail;
  const correctStr = formatDiv(val);
  const set = new Set<string>([correctStr]);
  const deltas = [-2, -1, -0.5, -0.25, -0.1, 0.1, 0.25, 0.5, 1, 2, 3];
  while (set.size < 4) {
    const d = deltas[Math.floor(Math.random() * deltas.length)];
    const candidate = Math.max(0.01, val + d);
    set.add(formatDiv(candidate));
  }
  const choices = Array.from(set).sort(() => Math.random() - 0.5);
  return { equation: `${leftExpr} ÷ ${tail} = ?`, correctAnswer: correctStr, choices };
}

export const MathPracticeArena: React.FC<MathPracticeArenaProps> = ({ onExit }) => {
  const [opMode, setOpMode] = useState<MathOperationMode>('MIXED');
  const [phase, setPhase] = useState<PracticePhase>('SETUP');
  const [round, setRound] = useState(1);
  const [operation, setOperation] = useState<MathOperation>('ADD');
  const [pickOptions, setPickOptions] = useState<number[]>([]);
  const [equationDisplay, setEquationDisplay] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [choices, setChoices] = useState<string[] | undefined>(undefined);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PracticePlayer[]>([
    { id: 'you', name: 'You', isBot: false, score: 0, lockedOut: false, solved: false },
    { id: 'bot1', name: 'Bot_Euler', isBot: true, score: 0, lockedOut: false, solved: false },
    { id: 'bot2', name: 'Bot_Ada', isBot: true, score: 0, lockedOut: false, solved: false },
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const playersRef = useRef(players);
  playersRef.current = players;
  const solvedCountRef = useRef(0);
  const deadlineRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);

  const clearScheduled = () => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current = [];
  };

  useEffect(() => () => clearScheduled(), []);

  const getRoundOp = (r: number): MathOperation => {
    if (opMode !== 'MIXED') return opMode;
    return OPS_CYCLE[(r - 1) % OPS_CYCLE.length];
  };

  const beginRound = (targetRound: number) => {
    clearScheduled();
    solvedCountRef.current = 0;
    const op = getRoundOp(targetRound);
    const opts = generate12RandomNumbers();
    setRound(targetRound);
    setOperation(op);
    setPickOptions(opts);
    setEquationDisplay('');
    setCorrectAnswer('');
    setChoices(undefined);
    setAnswerInput('');
    setFeedbackError(null);
    setPhase('PICKING');

    const updated = playersRef.current.map((p) => ({
      ...p,
      pickedNumber: undefined,
      roundPlacement: undefined,
      roundPoints: undefined,
      lockedOut: false,
      solved: false,
    }));
    setPlayers(updated);
    playersRef.current = updated;

    deadlineRef.current = Date.now() + MATH_PICK_DURATION_SEC * 1000;
    setTimeLeftMs(MATH_PICK_DURATION_SEC * 1000);

    // Bots pick quickly
    updated.forEach((p, idx) => {
      if (!p.isBot) return;
      const t = window.setTimeout(() => {
        const chosen = opts[Math.floor(Math.random() * opts.length)];
        setPlayers((prev) =>
          prev.map((pl) => (pl.id === p.id ? { ...pl, pickedNumber: chosen } : pl))
        );
      }, 650 + idx * 450);
      timeoutIdsRef.current.push(t);
    });

    const raceStartTimer = window.setTimeout(() => {
      startRace(opts, op, targetRound);
    }, MATH_PICK_DURATION_SEC * 1000);
    timeoutIdsRef.current.push(raceStartTimer);
  };

  const startRace = (opts: number[], op: MathOperation, targetRound: number) => {
    clearScheduled();
    const finalized = playersRef.current.map((p) => ({
      ...p,
      pickedNumber: p.pickedNumber ?? opts[Math.floor(Math.random() * opts.length)],
    }));
    setPlayers(finalized);
    playersRef.current = finalized;

    const problem = buildPracticeProblem(
      finalized.map((p) => ({ name: p.name, num: p.pickedNumber! })),
      op
    );
    setEquationDisplay(problem.equation);
    setCorrectAnswer(problem.correctAnswer);
    setChoices(problem.choices);
    setPhase('RACING');
    soundManager.playTurnStart();

    deadlineRef.current = Date.now() + MATH_RACE_DURATION_SEC * 1000;
    setTimeLeftMs(MATH_RACE_DURATION_SEC * 1000);

    if (op !== 'DIVIDE') {
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }

    // Bots attempt solve
    finalized.forEach((p, idx) => {
      if (!p.isBot) return;
      const solveDelay = 3000 + Math.floor(Math.random() * 5200) + idx * 400;
      const bt = window.setTimeout(() => {
        setPlayers((prev) => {
          const target = prev.find((pl) => pl.id === p.id);
          if (!target || target.solved) return prev;
          const place = solvedCountRef.current + 1;
          solvedCountRef.current = place;
          const pts = MATH_PLACEMENT_POINTS[place - 1] ?? 25;
          const next = prev.map((pl) =>
            pl.id === p.id
              ? { ...pl, solved: true, roundPlacement: place, roundPoints: pts, score: pl.score + pts }
              : pl
          );
          if (next.every((pl) => pl.solved || pl.lockedOut)) {
            finishRound(targetRound);
          }
          return next;
        });
      }, solveDelay);
      timeoutIdsRef.current.push(bt);
    });

    const raceEndTimer = window.setTimeout(() => {
      finishRound(targetRound);
    }, MATH_RACE_DURATION_SEC * 1000);
    timeoutIdsRef.current.push(raceEndTimer);
  };

  const finishRound = (targetRound: number) => {
    clearScheduled();
    setPhase('ROUND_RESULT');
    const nextTimer = window.setTimeout(() => {
      if (targetRound >= MATH_TOTAL_ROUNDS) {
        soundManager.playVictory();
        setPhase('FINISHED');
      } else {
        beginRound(targetRound + 1);
      }
    }, 2400);
    timeoutIdsRef.current.push(nextTimer);
  };

  useEffect(() => {
    if (phase !== 'PICKING' && phase !== 'RACING') return;
    const id = window.setInterval(() => {
      setTimeLeftMs(Math.max(0, deadlineRef.current - Date.now()));
    }, 100);
    return () => window.clearInterval(id);
  }, [phase]);

  const handleStartGame = () => {
    const resetPlayers = players.map((p) => ({
      ...p,
      score: 0,
      pickedNumber: undefined,
      roundPlacement: undefined,
      roundPoints: undefined,
      lockedOut: false,
      solved: false,
    }));
    setPlayers(resetPlayers);
    playersRef.current = resetPlayers;
    beginRound(1);
  };

  const handleHumanPick = (num: number) => {
    if (phase !== 'PICKING') return;
    const me = playersRef.current.find((p) => !p.isBot);
    if (me?.pickedNumber !== undefined) return;
    soundManager.playPickConfirm();
    const updated = playersRef.current.map((p) => (p.isBot ? p : { ...p, pickedNumber: num }));
    setPlayers(updated);
    playersRef.current = updated;
  };

  const submitHumanAnswer = (raw: string) => {
    if (phase !== 'RACING') return;
    const me = playersRef.current.find((p) => !p.isBot);
    if (!me || me.solved || me.lockedOut) return;

    const trimmed = raw.trim();
    const normalizedInput = Number(trimmed);
    const normalizedTarget = Number(correctAnswer);
    const isCorrect =
      !Number.isNaN(normalizedInput) &&
      (operation === 'DIVIDE'
        ? trimmed === correctAnswer || Math.abs(normalizedInput - normalizedTarget) < 0.015
        : normalizedInput === normalizedTarget);

    if (!isCorrect) {
      soundManager.playMathWrong();
      if (operation === 'DIVIDE') {
        setFeedbackError('Wrong choice! Locked out until the next round.');
        setPlayers((prev) => prev.map((p) => (p.isBot ? p : { ...p, lockedOut: true })));
      } else {
        setFeedbackError('Incorrect — keep trying!');
      }
      return;
    }

    soundManager.playMathCorrect();
    setFeedbackError(null);
    const place = solvedCountRef.current + 1;
    solvedCountRef.current = place;
    const pts = MATH_PLACEMENT_POINTS[place - 1] ?? 25;

    const updated = playersRef.current.map((p) =>
      p.isBot ? p : { ...p, solved: true, roundPlacement: place, roundPoints: pts, score: p.score + pts }
    );
    setPlayers(updated);
    playersRef.current = updated;

    if (updated.every((p) => p.solved || p.lockedOut)) {
      finishRound(round);
    }
  };

  const me = players.find((p) => !p.isBot)!;
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 bg-surface border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              clearScheduled();
              onExit();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Exit
          </button>
          <span className="font-black text-sm sm:text-base text-amber-300 flex items-center gap-1.5">
            <Calculator className="w-4 h-4" /> MathBlitz Practice
          </span>
        </div>

        {phase !== 'SETUP' && phase !== 'FINISHED' && (
          <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-black">
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
              ROUND {round}/{MATH_TOTAL_ROUNDS}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white border border-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {phase === 'PICKING' ? (timeLeftMs / 1000).toFixed(1) : Math.ceil(timeLeftMs / 1000)}s
            </span>
          </div>
        )}
      </header>

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 overflow-y-auto">
        {phase === 'SETUP' && (
          <div className="w-full max-w-md bg-card border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 mx-auto">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Practice Simulator</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Play 10 full rounds vs 2 AI Math Bots using the official 3s Pick &amp; 1-Min (60s) Race rules.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                Select Operation Mode
              </label>
              <select
                value={opMode}
                onChange={(e) => setOpMode(e.target.value as MathOperationMode)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-amber-400"
              >
                <option value="MIXED">Balanced Mix (+ − × ÷)</option>
                <option value="ADD">Addition Only (+)</option>
                <option value="SUBTRACT">Subtraction Only (−)</option>
                <option value="MULTIPLY">Multiplication Only (×)</option>
                <option value="DIVIDE">Division Only (4 Choices ÷)</option>
              </select>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-glow cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" /> Start 10-Round Practice
            </button>
          </div>
        )}

        {(phase === 'PICKING' || phase === 'RACING' || phase === 'ROUND_RESULT') && (
          <div className="w-full max-w-3xl space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-2xl border text-xs ${
                    p.solved
                      ? 'bg-emerald-500/15 border-emerald-400/40'
                      : !p.isBot
                      ? 'bg-amber-500/10 border-amber-400/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="font-bold text-white truncate">{p.name}</div>
                  <div className="font-mono text-amber-300 font-black">{p.score} pts</div>
                  {phase !== 'PICKING' && p.pickedNumber !== undefined && (
                    <div className="text-[10px] font-mono text-cyan-300">Pick: #{p.pickedNumber}</div>
                  )}
                </div>
              ))}
            </div>

            {phase === 'PICKING' && (
              <div className="bg-card border border-cyan-500/30 rounded-3xl p-5 sm:p-7 space-y-4 text-center">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {me.pickedNumber !== undefined
                    ? `Picked ${me.pickedNumber}! Starting equation...`
                    : `Pick Any Number (Next: ${operation})`}
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {pickOptions.map((n) => (
                    <button
                      key={n}
                      disabled={me.pickedNumber !== undefined}
                      onClick={() => handleHumanPick(n)}
                      className={`py-3.5 rounded-2xl border font-mono font-black text-2xl transition-all ${
                        me.pickedNumber === n
                          ? 'bg-cyan-400 text-slate-950 border-white scale-105'
                          : me.pickedNumber !== undefined
                          ? 'bg-slate-900/40 border-slate-800 text-slate-600'
                          : 'bg-slate-900 hover:bg-cyan-500/20 border-slate-700 hover:border-cyan-400 text-white cursor-pointer'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === 'RACING' && (
              <div className="bg-card border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 text-center">
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 sm:p-7">
                  <div className="text-3xl sm:text-5xl font-mono font-black text-white">{equationDisplay}</div>
                </div>

                {me.solved ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-black flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Solved #{me.roundPlacement} (+{me.roundPoints} pts)!
                  </div>
                ) : operation === 'DIVIDE' && choices ? (
                  me.lockedOut ? (
                    <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" /> Wrong choice! Locked out until next round.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-rose-300 flex items-center justify-center gap-1">
                        <Divide className="w-3.5 h-3.5" /> Division: Pick 1 Choice Only
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {choices.map((c) => (
                          <button
                            key={c}
                            onClick={() => submitHumanAnswer(c)}
                            className="py-4 rounded-2xl bg-slate-900 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 font-mono font-black text-2xl text-white cursor-pointer"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!answerInput.trim()) return;
                      submitHumanAnswer(answerInput);
                      setAnswerInput('');
                    }}
                    className="space-y-2"
                  >
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswerInput((v) => (v.startsWith('-') ? v.slice(1) : `-${v}`))}
                        className="px-3.5 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 font-mono font-black text-amber-300 cursor-pointer"
                      >
                        +/−
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        value={answerInput}
                        onChange={(e) => setAnswerInput(e.target.value)}
                        placeholder="Type answer..."
                        className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 font-mono font-black text-2xl text-white outline-none"
                      />
                      <button
                        type="submit"
                        className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    {feedbackError && <p className="text-xs text-rose-400 font-bold">{feedbackError}</p>}
                  </form>
                )}
              </div>
            )}

            {phase === 'ROUND_RESULT' && (
              <div className="bg-card border border-emerald-500/30 rounded-3xl p-6 text-center space-y-2">
                <span className="text-xs font-mono uppercase text-emerald-400 font-bold">Correct Answer</span>
                <div className="text-4xl font-mono font-black text-emerald-300">{correctAnswer}</div>
                <p className="text-xs text-slate-400">Next round starting shortly...</p>
              </div>
            )}
          </div>
        )}

        {phase === 'FINISHED' && (
          <div className="w-full max-w-md bg-card border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-2xl font-black text-white">Practice Complete!</h2>
            <div className="space-y-2 text-left">
              {sorted.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm"
                >
                  <span className="font-bold text-white flex items-center gap-1.5">
                    #{idx + 1} {p.name} {idx === 0 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  </span>
                  <span className="font-mono font-black text-amber-300">{p.score} pts</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleStartGame}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Replay
              </button>
              <button
                onClick={onExit}
                className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-200 font-bold text-sm cursor-pointer"
              >
                Back to Hub
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
