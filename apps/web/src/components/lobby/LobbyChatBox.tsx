import { MessageSquare, Send, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useGame } from '../../context/GameContext.js';

interface LobbyChatBoxProps {
  className?: string;
  maxHeight?: string;
}

export const LobbyChatBox: React.FC<LobbyChatBoxProps> = ({
  className = '',
  maxHeight = 'max-h-[360px]',
}) => {
  const { user } = useAuth();
  const { chatMessages, sendChatMessage } = useGame();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    sendChatMessage(trimmed);
    setInputText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`bg-card border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
              <span>Room Chat</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                {chatMessages.length}
              </span>
            </h3>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE</span>
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div
        className={`flex-1 min-h-[180px] sm:min-h-[220px] ${maxHeight} overflow-y-auto space-y-2 pr-1 no-scrollbar flex flex-col`}
      >
        {chatMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs gap-1.5 my-auto">
            <MessageSquare className="w-8 h-8 text-slate-700 stroke-[1.5]" />
            <span className="font-medium">No messages yet.</span>
            <span className="text-[11px] text-slate-600">Send a message to greet scholars in the room!</span>
          </div>
        ) : (
          chatMessages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="w-full flex justify-center py-1">
                  <span className="text-[10px] font-mono text-cyan-300/90 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-0.5 rounded-full text-center max-w-[95%] truncate shadow-sm flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    <span>{msg.text}</span>
                  </span>
                </div>
              );
            }

            const isMe = msg.userId === user?.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[90%] ${
                  isMe ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 px-1 text-[10px] text-slate-400">
                  <span className={`font-bold ${isMe ? 'text-accent-secondary' : 'text-slate-300'}`}>
                    {isMe ? 'You' : msg.username}
                  </span>
                  <span className="text-[9px] font-mono opacity-60">{formatTime(msg.timestamp)}</span>
                </div>

                <div
                  className={`px-3 py-1.5 rounded-2xl text-xs font-sans break-words shadow-sm leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-indigo-600/90 to-accent-primary/90 text-white rounded-tr-sm border border-indigo-400/30'
                      : 'bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleSend} className="mt-2.5 pt-2 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message scholars in room... (Enter)"
          maxLength={200}
          className="flex-1 bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors outline-none font-sans"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`p-2 rounded-xl transition-all flex items-center justify-center shrink-0 ${
            inputText.trim()
              ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 font-black shadow-glow hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
