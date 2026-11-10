import { CheckCircle2, KeyRound, Lock, Mail, ShieldAlert, User, X, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'register' | 'verify' | 'forgot';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialTab = 'login', onClose }) => {
  const { login, register, verifyEmail, loginAsGuest } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'verify' | 'forgot'>(initialTab);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await register({
        displayName: displayName.trim() || username.trim(),
        username: username.trim(),
        password,
      });
      setSuccessMessage('Registration successful! Welcome to WordChain.');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await login({ username: username.trim(), password });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginAsGuest();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await verifyEmail({ token: verificationToken });
      setSuccessMessage('Email verified successfully! You are now eligible for Competitive Ranked play.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.auth.forgotPassword({ email });
      setSuccessMessage('If an account matches this email, a reset token has been issued.');
      if (res.resetToken && res.resetToken !== 'SIMULATED_TOKEN') {
        setResetToken(res.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Password reset request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.auth.resetPassword({ token: resetToken, newPassword });
      setSuccessMessage(res.message);
      setTimeout(() => {
        setTab('login');
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Reset password failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto bg-surface border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center font-bold text-accent-secondary">
              W
            </div>
            <h3 className="font-extrabold text-lg text-white">
              {tab === 'login' && 'Sign In to WordChain'}
              {tab === 'register' && 'Academic Registration'}
              {tab === 'verify' && 'Verify Academic Email'}
              {tab === 'forgot' && 'Account Recovery'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        {tab !== 'verify' && (
          <div className="flex border-b border-slate-800 bg-slate-900/30">
            <button
              onClick={() => { setTab('login'); setError(null); }}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                tab === 'login'
                  ? 'border-accent-primary text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError(null); }}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                tab === 'register'
                  ? 'border-accent-primary text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-state-danger/15 border border-state-danger/30 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-state-success/15 border border-state-success/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN TAB */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setError(null); }}
                    className="text-xs text-accent-secondary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm bg-accent-primary hover:bg-indigo-500 text-white shadow-glow transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Arena'}
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-700/80 w-full" />
                <span className="bg-slate-900 px-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
                  Or instant access
                </span>
              </div>

              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>{loading ? 'Creating Guest...' : 'Play as Guest (No Sign Up)'}</span>
              </button>
            </form>
          )}

          {/* REGISTER TAB */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Master Scholar"
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-primary"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Name visible to other players in the game</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. scholar123"
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-primary"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">3-20 characters (letters, numbers, underscores)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-primary"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Minimum 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-accent-primary to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-glow transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Creating Scholar Account...' : 'Create Account (Start at Nursery III)'}
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-700/80 w-full" />
                <span className="bg-slate-900 px-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
                  Or skip sign up
                </span>
              </div>

              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>{loading ? 'Creating Guest...' : 'Play as Guest (Instant Play)'}</span>
              </button>
            </form>
          )}

          {/* VERIFY EMAIL TAB */}
          {tab === 'verify' && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter the verification token to confirm your account and unlock competitive ranked matchmaking.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Verification Token</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value)}
                    placeholder="Enter token hex..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm bg-state-success hover:bg-emerald-600 text-white shadow-glowEmerald transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Scholar Account'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD TAB */}
          {tab === 'forgot' && (
            <div className="space-y-4">
              {!resetToken ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Enter your registered email address to receive password recovery instructions.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="scholar@wordchain.gg"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTab('login')}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                      Back to Login
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-accent-primary hover:bg-indigo-500 text-white"
                    >
                      {loading ? 'Sending...' : 'Request Token'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <p className="text-xs text-emerald-400 font-semibold">
                    Recovery token ready. Enter your new password below:
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-accent-primary hover:bg-indigo-500 text-white"
                  >
                    {loading ? 'Updating...' : 'Set New Password'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
