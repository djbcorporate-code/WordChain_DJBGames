import React, { useState } from 'react';
import { AdminModal } from './components/admin/AdminModal.js';
import { AuthModal } from './components/AuthModal.js';
import { LeaderboardModal } from './components/leaderboard/LeaderboardModal.js';
import { LobbyRoomView } from './components/lobby/LobbyRoomView.js';
import { PrivateRoomModal } from './components/lobby/PrivateRoomModal.js';
import { QueueModal } from './components/lobby/QueueModal.js';
import { Navbar } from './components/Navbar.js';
import { ProfileModal } from './components/profile/ProfileModal.js';
import { AuthProvider } from './context/AuthContext.js';
import { GameProvider, useGame } from './context/GameContext.js';
import { Dashboard } from './pages/Dashboard.js';
import { LiveMultiplayerArena } from './pages/LiveMultiplayerArena.js';
import { PracticeArena } from './pages/PracticeArena.js';

export const AppContent: React.FC = () => {
  const { currentRoom } = useGame();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register' | 'verify'>('login');
  const [privateRoomModalOpen, setPrivateRoomModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | undefined>(undefined);
  const [inPracticeArena, setInPracticeArena] = useState(false);

  const handleOpenAuth = (tab: 'login' | 'register' | 'verify') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  const handleOpenProfile = (username?: string) => {
    setSelectedProfileUsername(username);
    setProfileModalOpen(true);
  };

  // Determine active view mode
  const isWaitingInLobby = currentRoom && currentRoom.status === 'WAITING';
  const isInLiveMatch = currentRoom && (currentRoom.status === 'IN_PROGRESS' || currentRoom.status === 'COUNTDOWN' || currentRoom.status === 'FINISHED');
  const hideNavbarAndFooter = inPracticeArena || isInLiveMatch;

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col font-sans selection:bg-accent-primary selection:text-white">
      {!hideNavbarAndFooter && (
        <Navbar
          onOpenAuth={handleOpenAuth}
          onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
          onOpenProfile={() => handleOpenProfile(undefined)}
          onOpenAdmin={() => setAdminModalOpen(true)}
        />
      )}

      <main className="flex-1 flex flex-col">
        {inPracticeArena ? (
          <PracticeArena onExit={() => setInPracticeArena(false)} />
        ) : isInLiveMatch ? (
          <LiveMultiplayerArena />
        ) : isWaitingInLobby ? (
          <LobbyRoomView />
        ) : (
          <Dashboard
            onOpenAuth={handleOpenAuth}
            onStartPractice={() => setInPracticeArena(true)}
            onOpenPrivateRoom={() => setPrivateRoomModalOpen(true)}
          />
        )}
      </main>

      {!hideNavbarAndFooter && (
        <footer className="border-t border-slate-900 bg-surface/50 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>WordChain &copy; 2026. Authoritative Multiplayer English Lexicon Arena.</span>
            <span className="font-mono text-[11px] text-slate-400">Quarterly Seasons • Academic Rank Hierarchy</span>
          </div>
        </footer>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authInitialTab}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Private Room Modal */}
      <PrivateRoomModal
        isOpen={privateRoomModalOpen}
        onClose={() => setPrivateRoomModalOpen(false)}
      />

      {/* Global Leaderboards Modal */}
      <LeaderboardModal
        isOpen={leaderboardModalOpen}
        onClose={() => setLeaderboardModalOpen(false)}
        onSelectScholar={(username) => {
          setLeaderboardModalOpen(false);
          handleOpenProfile(username);
        }}
      />

      {/* Scholar Profile & Cosmetics Locker Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        username={selectedProfileUsername}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Admin Operations Console Modal */}
      <AdminModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />

      {/* Matchmaking Queue Search Modal */}
      <QueueModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </AuthProvider>
  );
};

export default App;
