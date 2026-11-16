import { GameType } from '@wordchain/shared';
import React, { useState } from 'react';
import { AdminModal } from './components/admin/AdminModal.js';
import { AuthModal } from './components/AuthModal.js';
import { LeaderboardModal } from './components/leaderboard/LeaderboardModal.js';
import { ImpostorIntroOverlay } from './components/impostor/ImpostorIntroOverlay.js';
import { ChessLobbyRoomView } from './components/lobby/ChessLobbyRoomView.js';
import { ChessPrivateRoomModal } from './components/lobby/ChessPrivateRoomModal.js';
import { ImpostorLobbyView } from './components/lobby/ImpostorLobbyView.js';
import { LobbyRoomView } from './components/lobby/LobbyRoomView.js';
import { MathLobbyRoomView } from './components/lobby/MathLobbyRoomView.js';
import { MathPrivateRoomModal } from './components/lobby/MathPrivateRoomModal.js';
import { PrivateRoomModal } from './components/lobby/PrivateRoomModal.js';
import { QueueModal } from './components/lobby/QueueModal.js';
import { Navbar } from './components/Navbar.js';
import { ProfileModal } from './components/profile/ProfileModal.js';
import { AuthProvider } from './context/AuthContext.js';
import { ChessGameProvider, useChessGame } from './context/ChessGameContext.js';
import { GameProvider, useGame } from './context/GameContext.js';
import { ImpostorGameProvider, useImpostorGame } from './context/ImpostorGameContext.js';
import { MathGameProvider, useMathGame } from './context/MathGameContext.js';
import { VoiceChatProvider } from './context/VoiceChatContext.js';
import { ChessDashboard } from './pages/ChessDashboard.js';
import { ChessLiveArena } from './pages/ChessLiveArena.js';
import { ChessPracticeArena } from './pages/ChessPracticeArena.js';
import { Dashboard } from './pages/Dashboard.js';
import { GameCatalogPage } from './pages/GameCatalogPage.js';
import { ImpostorDashboard } from './pages/ImpostorDashboard.js';
import { ImpostorLiveArena } from './pages/ImpostorLiveArena.js';
import { LiveMultiplayerArena } from './pages/LiveMultiplayerArena.js';
import { MathDashboard } from './pages/MathDashboard.js';
import { MathLiveArena } from './pages/MathLiveArena.js';
import { MathPracticeArena } from './pages/MathPracticeArena.js';
import { PracticeArena } from './pages/PracticeArena.js';

export const AppContent: React.FC = () => {
  const { currentRoom } = useGame();
  const { mathRoom } = useMathGame();
  const { chessRoom } = useChessGame();
  const { impostorRoom } = useImpostorGame();
  const [selectedGame, setSelectedGame] = useState<'CATALOG' | GameType>('CATALOG');
  const [showImpostorIntro, setShowImpostorIntro] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register' | 'verify'>('login');
  const [privateRoomModalOpen, setPrivateRoomModalOpen] = useState(false);
  const [mathPrivateModalOpen, setMathPrivateModalOpen] = useState(false);
  const [chessPrivateModalOpen, setChessPrivateModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | undefined>(undefined);
  const [inPracticeArena, setInPracticeArena] = useState(false);
  const [inMathPracticeArena, setInMathPracticeArena] = useState(false);
  const [inChessPracticeArena, setInChessPracticeArena] = useState(false);

  const handleOpenAuth = (tab: 'login' | 'register' | 'verify' = 'login') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  const handleOpenProfile = (username?: string) => {
    setSelectedProfileUsername(username);
    setProfileModalOpen(true);
  };

  // Determine active view & room mode across all portal games
  const isWaitingInWordLobby = currentRoom && currentRoom.status === 'WAITING';
  const isWaitingInMathLobby = mathRoom && mathRoom.status === 'WAITING';
  const isWaitingInChessLobby = chessRoom && chessRoom.status === 'WAITING';
  const isWaitingInImpostorLobby =
    impostorRoom && (impostorRoom.status === 'WAITING' || impostorRoom.status === 'COUNTDOWN');
  const isWaitingInLobby =
    isWaitingInWordLobby ||
    isWaitingInMathLobby ||
    isWaitingInChessLobby ||
    isWaitingInImpostorLobby;

  const isInWordLiveMatch =
    currentRoom && (currentRoom.status === 'IN_PROGRESS' || currentRoom.status === 'COUNTDOWN' || currentRoom.status === 'FINISHED');
  const isInMathLiveMatch =
    mathRoom && (mathRoom.status === 'IN_PROGRESS' || mathRoom.status === 'COUNTDOWN' || mathRoom.status === 'FINISHED');
  const isInChessLiveMatch =
    chessRoom && (chessRoom.status === 'IN_PROGRESS' || chessRoom.status === 'COUNTDOWN' || chessRoom.status === 'FINISHED');
  const isInImpostorLiveMatch =
    impostorRoom && (impostorRoom.status === 'IN_PROGRESS' || impostorRoom.status === 'FINISHED');

  const isInMatchMode =
    inPracticeArena ||
    inMathPracticeArena ||
    inChessPracticeArena ||
    isInWordLiveMatch ||
    isInMathLiveMatch ||
    isInChessLiveMatch ||
    isInImpostorLiveMatch;
  const hideNavbar = isInMatchMode;
  const showFooter = !isInMatchMode && !isWaitingInLobby;

  const activeNavGame: 'CATALOG' | GameType = currentRoom
    ? 'WORDCHAIN'
    : mathRoom
    ? 'MATHRACE'
    : chessRoom
    ? 'CHESS'
    : impostorRoom
    ? 'IMPOSTOR'
    : selectedGame;

  const handleReturnToCatalog = () => {
    if (!currentRoom && !mathRoom && !chessRoom && !impostorRoom) {
      setShowImpostorIntro(false);
      setSelectedGame('CATALOG');
    }
  };

  const handleSelectGame = (game: GameType) => {
    setSelectedGame(game);
    if (game === 'IMPOSTOR') {
      setShowImpostorIntro(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-100">
      {!hideNavbar && (
        <Navbar
          activeGame={activeNavGame}
          onReturnToCatalog={handleReturnToCatalog}
          onOpenAuth={handleOpenAuth}
          onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
          onOpenProfile={() => handleOpenProfile(undefined)}
          onOpenAdmin={() => setAdminModalOpen(true)}
        />
      )}

      <main className="flex-1 flex flex-col">
        {isInWordLiveMatch ? (
          <LiveMultiplayerArena />
        ) : isInMathLiveMatch ? (
          <MathLiveArena />
        ) : isInChessLiveMatch ? (
          <ChessLiveArena />
        ) : isInImpostorLiveMatch ? (
          <ImpostorLiveArena />
        ) : isWaitingInWordLobby ? (
          <LobbyRoomView />
        ) : isWaitingInMathLobby ? (
          <MathLobbyRoomView />
        ) : isWaitingInChessLobby ? (
          <ChessLobbyRoomView />
        ) : isWaitingInImpostorLobby ? (
          <ImpostorLobbyView />
        ) : inPracticeArena ? (
          <PracticeArena onExit={() => setInPracticeArena(false)} />
        ) : inMathPracticeArena ? (
          <MathPracticeArena onExit={() => setInMathPracticeArena(false)} />
        ) : inChessPracticeArena ? (
          <ChessPracticeArena onExit={() => setInChessPracticeArena(false)} />
        ) : selectedGame === 'WORDCHAIN' ? (
          <Dashboard
            onOpenAuth={handleOpenAuth}
            onOpenPrivateRoom={() => setPrivateRoomModalOpen(true)}
            onStartPractice={() => setInPracticeArena(true)}
          />
        ) : selectedGame === 'MATHRACE' ? (
          <MathDashboard
            onOpenAuth={handleOpenAuth}
            onOpenPrivateModal={() => setMathPrivateModalOpen(true)}
            onOpenPractice={() => setInMathPracticeArena(true)}
          />
        ) : selectedGame === 'CHESS' ? (
          <ChessDashboard
            onOpenAuth={handleOpenAuth}
            onOpenPrivateModal={() => setChessPrivateModalOpen(true)}
            onOpenPractice={() => setInChessPracticeArena(true)}
          />
        ) : selectedGame === 'IMPOSTOR' ? (
          <ImpostorDashboard
            onBackToCatalog={handleReturnToCatalog}
            onReplayIntro={() => setShowImpostorIntro(true)}
            onOpenAuth={handleOpenAuth}
          />
        ) : (
          <GameCatalogPage
            onSelectGame={handleSelectGame}
            onOpenAuth={handleOpenAuth}
            onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
            onOpenProfile={() => handleOpenProfile(undefined)}
          />
        )}
      </main>

      {showFooter && (
        <footer className="border-t border-slate-900 bg-surface/50 py-5 text-center text-xs text-slate-500 shrink-0">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>DJB Arcade &copy; 2026. Multi-Game Competitive Arena Portal.</span>
            <span className="font-mono text-[11px] text-slate-400">WordChain · MathBlitz · Sovereign Chess · Who Is The Impostor · Single-Account Access</span>
          </div>
        </footer>
      )}

      {/* Animated Classified Briefing Intro when Who Is The Impostor opens */}
      {showImpostorIntro && selectedGame === 'IMPOSTOR' && !impostorRoom && (
        <ImpostorIntroOverlay onComplete={() => setShowImpostorIntro(false)} />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authInitialTab}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* WordChain Private Room Modal */}
      <PrivateRoomModal
        isOpen={privateRoomModalOpen}
        onClose={() => setPrivateRoomModalOpen(false)}
      />

      {/* MathBlitz Private Room Modal */}
      <MathPrivateRoomModal
        isOpen={mathPrivateModalOpen}
        onClose={() => setMathPrivateModalOpen(false)}
      />

      {/* Sovereign Chess Private Room Modal */}
      <ChessPrivateRoomModal
        isOpen={chessPrivateModalOpen}
        onClose={() => setChessPrivateModalOpen(false)}
      />

      {/* Global Leaderboards Modal */}
      <LeaderboardModal
        isOpen={leaderboardModalOpen}
        defaultGameType={
          activeNavGame === 'MATHRACE' ? 'MATHRACE' : activeNavGame === 'CHESS' ? 'CHESS' : 'WORDCHAIN'
        }
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
        <MathGameProvider>
          <ChessGameProvider>
            <ImpostorGameProvider>
              <VoiceChatProvider>
                <AppContent />
              </VoiceChatProvider>
            </ImpostorGameProvider>
          </ChessGameProvider>
        </MathGameProvider>
      </GameProvider>
    </AuthProvider>
  );
};

export default App;
