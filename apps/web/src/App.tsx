import React, { useState } from 'react';
import { AuthModal } from './components/AuthModal.js';
import { Navbar } from './components/Navbar.js';
import { AuthProvider } from './context/AuthContext.js';
import { Dashboard } from './pages/Dashboard.js';

export const AppContent: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register' | 'verify'>('login');

  const handleOpenAuth = (tab: 'login' | 'register' | 'verify') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col font-sans selection:bg-accent-primary selection:text-white">
      <Navbar onOpenAuth={handleOpenAuth} />
      <main className="flex-1">
        <Dashboard onOpenAuth={handleOpenAuth} />
      </main>

      <footer className="border-t border-slate-900 bg-surface/50 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>WordChain &copy; 2026. Authoritative Multiplayer English Lexicon Arena.</span>
          <span className="font-mono text-[11px] text-slate-400">Quarterly Seasons • Academic Rank Hierarchy</span>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        initialTab={authInitialTab}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
