import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.js';
import { useGame } from './GameContext.js';
import { socketService } from '../services/socket.js';

interface VoiceChatContextType {
  isOpenMicEnabled: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  speakingUsers: Set<string>;
  mutedUsers: Set<string>;
  micPermission: 'prompt' | 'granted' | 'denied' | 'unsupported';
  activePeersCount: number;
  error: string | null;
  toggleOpenMic: () => Promise<void>;
  toggleMute: () => void;
  toggleDeafen: () => void;
  clearError: () => void;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const VoiceChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentRoom } = useGame();

  const [isOpenMicEnabled, setIsOpenMicEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [error, setError] = useState<string | null>(null);
  const [activePeersCount, setActivePeersCount] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const isPrivateRoom = currentRoom?.mode === 'PRIVATE';

  // Cleanup helper
  const teardownVoice = () => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore close error
      }
      audioContextRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    peersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {
        // Ignore close error
      }
    });
    peersRef.current.clear();

    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    });
    audioElementsRef.current.clear();
    pendingIceCandidatesRef.current.clear();

    setIsOpenMicEnabled(false);
    setIsSpeaking(false);
    setSpeakingUsers(new Set());
    setMutedUsers(new Set());
    setActivePeersCount(0);
  };

  // If leaving private room, automatically teardown voice
  useEffect(() => {
    if (!isPrivateRoom) {
      if (isOpenMicEnabled) {
        socketService.leaveVoiceRoom();
        teardownVoice();
      }
    }
  }, [isPrivateRoom]);

  // Adjust volume of all audio elements if deafened
  useEffect(() => {
    audioElementsRef.current.forEach((audio) => {
      audio.muted = isDeafened;
    });
  }, [isDeafened]);

  // Create or retrieve Peer Connection for a remote user
  const getOrCreatePeerConnection = (remoteUserId: string, isInitiator: boolean): RTCPeerConnection => {
    const existing = peersRef.current.get(remoteUserId);
    if (existing && existing.signalingState !== 'closed') {
      return existing;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(remoteUserId, pc);
    setActivePeersCount(peersRef.current.size);

    // Add local tracks if we have mic stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendVoiceSignal(remoteUserId, { candidate: event.candidate.toJSON() });
      }
    };

    // Remote audio track received
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      let audio = audioElementsRef.current.get(remoteUserId);

      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.muted = isDeafened;
        audioElementsRef.current.set(remoteUserId, audio);
      }

      audio.srcObject = remoteStream;
      audio.play().catch(() => {
        // User gesture may be required on some mobile browsers
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(remoteUserId);
      }
    };

    return pc;
  };

  const cleanupPeer = (remoteUserId: string) => {
    const pc = peersRef.current.get(remoteUserId);
    if (pc) {
      try {
        pc.close();
      } catch {
        // Ignore
      }
      peersRef.current.delete(remoteUserId);
    }

    const audio = audioElementsRef.current.get(remoteUserId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      audioElementsRef.current.delete(remoteUserId);
    }

    pendingIceCandidatesRef.current.delete(remoteUserId);
    setActivePeersCount(peersRef.current.size);

    setSpeakingUsers((prev) => {
      if (!prev.has(remoteUserId)) return prev;
      const next = new Set(prev);
      next.delete(remoteUserId);
      return next;
    });

    setMutedUsers((prev) => {
      if (!prev.has(remoteUserId)) return prev;
      const next = new Set(prev);
      next.delete(remoteUserId);
      return next;
    });
  };

  // Setup Voice Activity Detection (VAD)
  const setupVAD = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || isMuted) {
          if (isSpeaking) {
            setIsSpeaking(false);
            socketService.sendVoiceState(isMuted, false);
          }
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold for speaking
        const currentlySpeaking = average > 18;

        if (currentlySpeaking) {
          speakingCounter = Math.min(5, speakingCounter + 1);
        } else {
          speakingCounter = Math.max(0, speakingCounter - 1);
        }

        const shouldBeSpeaking = speakingCounter >= 2;

        if (shouldBeSpeaking !== isSpeaking) {
          setIsSpeaking(shouldBeSpeaking);
          socketService.sendVoiceState(isMuted, shouldBeSpeaking);
          if (user?.id) {
            setSpeakingUsers((prev) => {
              const next = new Set(prev);
              if (shouldBeSpeaking) next.add(user.id);
              else next.delete(user.id);
              return next;
            });
          }
        }
      }, 100);
    } catch (vadErr: any) {
      console.warn('[VoiceChat] Could not initialize VAD:', vadErr.message);
    }
  };

  // Turn Open Mic on or off
  const toggleOpenMic = async () => {
    if (!isPrivateRoom) {
      setError('Voice chat is only available in private rooms.');
      return;
    }

    if (isOpenMicEnabled) {
      // Turn Off
      socketService.leaveVoiceRoom();
      teardownVoice();
      return;
    }

    // Turn On
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermission('unsupported');
      setError('Microphone access is not supported on this browser or connection.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setMicPermission('granted');
      setIsOpenMicEnabled(true);
      setIsMuted(false);

      setupVAD(stream);
      socketService.joinVoiceRoom();

      // Initiate connection to all other human players in the room
      if (currentRoom && user) {
        for (const player of currentRoom.players) {
          if (player.userId !== user.id && !player.userId.startsWith('guest-')) {
            initiateCall(player.userId);
          }
        }
      }
    } catch (err: any) {
      console.error('[VoiceChat] Mic access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermission('denied');
        setError('Microphone permission denied. Allow microphone access in your browser settings to use Open Mic.');
      } else {
        setError(err.message || 'Could not access audio recording device.');
      }
      teardownVoice();
    }
  };

  const initiateCall = async (remoteUserId: string) => {
    try {
      const pc = getOrCreatePeerConnection(remoteUserId, true);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);
      socketService.sendVoiceSignal(remoteUserId, { type: 'offer', sdp: offer.sdp });
    } catch (err: any) {
      console.warn(`[VoiceChat] Error initiating call to ${remoteUserId}:`, err.message);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    socketService.sendVoiceState(nextMuted, false);

    if (user?.id) {
      setMutedUsers((prev) => {
        const next = new Set(prev);
        if (nextMuted) next.add(user.id);
        else next.delete(user.id);
        return next;
      });
    }
  };

  // Toggle Deafen
  const toggleDeafen = () => {
    setIsDeafened((prev) => !prev);
  };

  // Socket Event Listeners for WebRTC signaling
  useEffect(() => {
    const socket = socketService.getSocket();

    const handleVoicePeerJoined = async ({ userId }: { userId: string }) => {
      if (!isOpenMicEnabled || !user || userId === user.id) return;
      // Offer call to newly joined voice peer
      await initiateCall(userId);
    };

    const handleVoiceSignal = async ({ senderUserId, signal }: { senderUserId: string; signal: any }) => {
      if (!isPrivateRoom || !user || senderUserId === user.id) return;

      try {
        if (signal.type === 'offer') {
          const pc = getOrCreatePeerConnection(senderUserId, false);
          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          // Apply any pending candidates
          const pending = pendingIceCandidatesRef.current.get(senderUserId) || [];
          for (const cand of pending) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          pendingIceCandidatesRef.current.delete(senderUserId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketService.sendVoiceSignal(senderUserId, { type: 'answer', sdp: answer.sdp });
        } else if (signal.type === 'answer') {
          const pc = peersRef.current.get(senderUserId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const pending = pendingIceCandidatesRef.current.get(senderUserId) || [];
            for (const cand of pending) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            pendingIceCandidatesRef.current.delete(senderUserId);
          }
        } else if (signal.candidate) {
          const pc = peersRef.current.get(senderUserId);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            // Queue candidate until remote description is set
            const queued = pendingIceCandidatesRef.current.get(senderUserId) || [];
            queued.push(signal.candidate);
            pendingIceCandidatesRef.current.set(senderUserId, queued);
          }
        }
      } catch (signalErr: any) {
        console.warn(`[VoiceChat] Signal error with ${senderUserId}:`, signalErr.message);
      }
    };

    const handleVoiceStateUpdate = ({
      userId,
      isMuted: peerMuted,
      isSpeaking: peerSpeaking,
    }: {
      userId: string;
      isMuted: boolean;
      isSpeaking?: boolean;
    }) => {
      setMutedUsers((prev) => {
        const next = new Set(prev);
        if (peerMuted) next.add(userId);
        else next.delete(userId);
        return next;
      });

      setSpeakingUsers((prev) => {
        const next = new Set(prev);
        if (peerSpeaking && !peerMuted) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    const handleVoicePeerLeft = ({ userId }: { userId: string }) => {
      cleanupPeer(userId);
    };

    socket.on('VOICE_PEER_JOINED', handleVoicePeerJoined);
    socket.on('VOICE_SIGNAL', handleVoiceSignal);
    socket.on('VOICE_STATE_UPDATE', handleVoiceStateUpdate);
    socket.on('VOICE_PEER_LEFT', handleVoicePeerLeft);

    return () => {
      socket.off('VOICE_PEER_JOINED', handleVoicePeerJoined);
      socket.off('VOICE_SIGNAL', handleVoiceSignal);
      socket.off('VOICE_STATE_UPDATE', handleVoiceStateUpdate);
      socket.off('VOICE_PEER_LEFT', handleVoicePeerLeft);
    };
  }, [isOpenMicEnabled, isPrivateRoom, user]);

  return (
    <VoiceChatContext.Provider
      value={{
        isOpenMicEnabled,
        isMuted,
        isDeafened,
        isSpeaking,
        speakingUsers,
        mutedUsers,
        micPermission,
        activePeersCount,
        error,
        toggleOpenMic,
        toggleMute,
        toggleDeafen,
        clearError: () => setError(null),
      }}
    >
      {children}
    </VoiceChatContext.Provider>
  );
};

export function useVoiceChat(): VoiceChatContextType {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error('useVoiceChat must be used within a VoiceChatProvider');
  }
  return context;
}
