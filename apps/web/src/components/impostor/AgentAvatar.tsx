import React from 'react';

interface AgentAvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg';
  isAlive?: boolean;
  isSpeaking?: boolean;
  isImpostorRevealed?: boolean;
}

const NOIR_GRADIENTS = [
  'from-rose-600 to-red-800',
  'from-indigo-500 to-slate-800',
  'from-emerald-600 to-teal-900',
  'from-amber-500 to-orange-800',
  'from-fuchsia-600 to-purple-900',
  'from-cyan-600 to-sky-900',
];

function pickGradient(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  }
  return NOIR_GRADIENTS[hash % NOIR_GRADIENTS.length];
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  username,
  size = 'md',
  isAlive = true,
  isSpeaking = false,
  isImpostorRevealed = false,
}) => {
  const initial = (username || '?').trim().charAt(0).toUpperCase();
  const dimensions =
    size === 'sm'
      ? 'h-9 w-9 text-xs'
      : size === 'lg'
        ? 'h-14 w-14 text-lg'
        : 'h-11 w-11 text-sm';

  const gradient = isImpostorRevealed
    ? 'from-rose-600 to-rose-950'
    : !isAlive
      ? 'from-zinc-700 to-zinc-900'
      : pickGradient(username);

  return (
    <div
      className={`relative shrink-0 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white shadow-inner transition-all ${dimensions} ${
        !isAlive ? 'opacity-50 grayscale' : ''
      } ${
        isSpeaking
          ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0b0e17] shadow-[0_0_14px_rgba(16,185,129,0.55)]'
          : 'border border-white/15'
      }`}
    >
      {initial}
      {!isAlive && (
        <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-rose-600 text-[8px] font-black uppercase tracking-wider text-white border border-black">
          OUT
        </span>
      )}
    </div>
  );
};
