import {
  Activity,
  AlertOctagon,
  Ban,
  BookOpen,
  CheckCircle2,
  Database,
  History,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Terminal,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'MODERATION' | 'LEXICON' | 'AUDIT'>('TELEMETRY');
  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Moderation form states
  const [targetUserId, setTargetUserId] = useState('');
  const [suspendReason, setSuspendReason] = useState('Violation of fair play and word chaining terms.');

  // Lexicon form states
  const [addWordInput, setAddWordInput] = useState('');
  const [banWordInput, setBanWordInput] = useState('');
  const [banWordReason, setBanWordReason] = useState('Inappropriate / vulgar terminology.');

  const loadData = async () => {
    try {
      setLoading(true);
      const [telRes, logsRes] = await Promise.all([
        api.admin.getTelemetry(),
        api.admin.getAuditLogs(25),
      ]);
      setTelemetry(telRes.telemetry);
      setAuditLogs(logsRes.logs);
    } catch (err: any) {
      console.error('Failed to load admin telemetry:', err);
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setFeedback(null);
    }
  }, [isOpen]);

  const handleSuspend = async () => {
    if (!targetUserId.trim()) {
      setFeedback({ type: 'error', message: 'Target User ID is required.' });
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.admin.suspendUser(targetUserId.trim(), suspendReason);
      setFeedback({ type: 'success', message: res.message });
      setTargetUserId('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!targetUserId.trim()) {
      setFeedback({ type: 'error', message: 'Target User ID is required.' });
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.admin.unsuspendUser(targetUserId.trim());
      setFeedback({ type: 'success', message: res.message });
      setTargetUserId('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addWordInput.trim()) return;
    try {
      setActionLoading(true);
      const res = await api.admin.addLexiconWord(addWordInput.trim());
      setFeedback({ type: 'success', message: `Word '${res.word}' successfully approved & added into memory!` });
      setAddWordInput('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banWordInput.trim()) return;
    try {
      setActionLoading(true);
      const res = await api.admin.banLexiconWord(banWordInput.trim(), banWordReason);
      setFeedback({ type: 'success', message: `Word '${res.word}' blacklisted from tournament matches.` });
      setBanWordInput('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-rose-900/50 rounded-3xl p-5 sm:p-8 shadow-2xl flex flex-col space-y-5 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-glow">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">System Operations & Admin Console</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                  Admin Authority
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Server telemetry, anti-abuse enforcement, and tournament lexicon administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent-secondary' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 text-xs font-bold">
          <button
            onClick={() => setActiveTab('TELEMETRY')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'TELEMETRY'
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Server Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('MODERATION')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'MODERATION'
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Scholar Moderation</span>
          </button>

          <button
            onClick={() => setActiveTab('LEXICON')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'LEXICON'
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Lexicon Management</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'AUDIT'
                ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold text-center border animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {loading && !telemetry ? (
            <div className="py-20 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-accent-secondary" />
              <span>Fetching authoritative server telemetry...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: SERVER TELEMETRY */}
              {activeTab === 'TELEMETRY' && telemetry && (
                <div className="space-y-4 text-xs font-mono">
                  {/* Primary Cards 4-grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">Uptime</span>
                      <p className="text-xl font-black text-emerald-400">
                        {Math.floor(telemetry.uptimeSeconds / 60)}m {telemetry.uptimeSeconds % 60}s
                      </p>
                    </div>

                    <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">RAM (Heap)</span>
                      <p className="text-xl font-black text-indigo-400">
                        {telemetry.memory.heapUsedMb} / {telemetry.memory.heapTotalMb} MB
                      </p>
                    </div>

                    <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">Active Rooms</span>
                      <p className="text-xl font-black text-accent-secondary">
                        {telemetry.rooms.total}
                      </p>
                    </div>

                    <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">Lexicon Words</span>
                      <p className="text-xl font-black text-amber-400">
                        {telemetry.lexicon.totalWords.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Room Breakdown & Matchmaking Queue */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="font-bold text-white uppercase text-[11px] pb-1 border-b border-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-accent-secondary" /> Active Rooms Distribution
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Casual Lobbies:</span>
                        <strong className="text-slate-100">{telemetry.rooms.casual}</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Competitive Ranked:</span>
                        <strong className="text-indigo-400">{telemetry.rooms.ranked}</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Private Custom Rooms:</span>
                        <strong className="text-amber-400">{telemetry.rooms.private}</strong>
                      </div>
                      <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                        <span>Scholars in Match:</span>
                        <strong className="text-emerald-400">{telemetry.rooms.activePlayers}</strong>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="font-bold text-white uppercase text-[11px] pb-1 border-b border-slate-800 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-accent-secondary" /> Queue Depths & Database
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Casual Queue Depth:</span>
                        <strong className="text-slate-100">{telemetry.matchmaking.casualQueueCount}</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Ranked Queue Depth:</span>
                        <strong className="text-indigo-400">{telemetry.matchmaking.rankedQueueCount}</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Total Registered Scholars:</span>
                        <strong className="text-slate-100">{telemetry.database.totalRegisteredUsers}</strong>
                      </div>
                      <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                        <span>Matches Settled:</span>
                        <strong className="text-emerald-400">{telemetry.database.totalMatchesCompleted}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SCHOLAR MODERATION */}
              {activeTab === 'MODERATION' && (
                <div className="space-y-4">
                  <div className="bg-card border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Ban className="w-4 h-4 text-rose-500" /> Account Suspension & Immediate Disconnect
                      </h3>
                      <p className="text-xs text-slate-400">
                        Suspending an account automatically terminates any live WebSocket sessions and forfeits their active game seats.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-mono font-bold text-slate-400 block mb-1">
                          Target Scholar User ID (UUID)
                        </label>
                        <input
                          type="text"
                          value={targetUserId}
                          onChange={(e) => setTargetUserId(e.target.value)}
                          placeholder="e.g. 70707070-7070-7070-7070-707070707070"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-mono font-bold text-slate-400 block mb-1">
                          Suspension Reason (Audit Log)
                        </label>
                        <input
                          type="text"
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                          placeholder="Reason for suspension..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={handleSuspend}
                          disabled={actionLoading}
                          className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-glow flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Suspend & Sever Sockets</span>
                        </button>

                        <button
                          onClick={handleUnsuspend}
                          disabled={actionLoading}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Unsuspend Scholar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LEXICON MANAGEMENT */}
              {activeTab === 'LEXICON' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Add word */}
                  <form onSubmit={handleAddWord} className="bg-card border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-emerald-400" /> Insert Approved Word
                      </h3>
                      <p className="text-xs text-slate-400">
                        Adds a word to the active memory trie immediately across all current and future matches.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={addWordInput}
                        onChange={(e) => setAddWordInput(e.target.value)}
                        placeholder="e.g. CYBERPUNK"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono uppercase text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                      />

                      <button
                        type="submit"
                        disabled={actionLoading || !addWordInput.trim()}
                        className="w-full py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-glow flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add to Lexicon</span>
                      </button>
                    </div>
                  </form>

                  {/* Ban word */}
                  <form onSubmit={handleBanWord} className="bg-card border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4 text-rose-500" /> Blacklist Word
                      </h3>
                      <p className="text-xs text-slate-400">
                        Immediately removes a word from the approved lexicon, causing subsequent submissions to be rejected.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={banWordInput}
                        onChange={(e) => setBanWordInput(e.target.value)}
                        placeholder="e.g. OFFENSIVEWORD"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono uppercase text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                      />

                      <input
                        type="text"
                        value={banWordReason}
                        onChange={(e) => setBanWordReason(e.target.value)}
                        placeholder="Blacklist reason..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                      />

                      <button
                        type="submit"
                        disabled={actionLoading || !banWordInput.trim()}
                        className="w-full py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-glow flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Ban from Lexicon</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: AUDIT TRAIL */}
              {activeTab === 'AUDIT' && (
                <div className="rounded-2xl border border-slate-800 bg-card overflow-hidden">
                  {auditLogs.length === 0 ? (
                    <div className="py-16 text-center text-xs font-mono text-slate-400">
                      No administrative actions logged yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Admin</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Target</th>
                          <th className="py-2.5 px-3">Metadata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="py-2.5 px-3 text-white font-bold">{log.adminUsername}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.action.includes('BAN') || log.action.includes('SUSPEND')
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 max-w-[120px] truncate">
                              {log.targetId || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 max-w-[200px] truncate">
                              {log.metadata || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
