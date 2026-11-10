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

// High-availability global STUN servers for WebRTC NAT traversal
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
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
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());

  const isPrivateRoom = currentRoom?.mode === 'PRIVATE';

  // Helper: Resume/play all connected audio elements (bypasses browser autoplay lock)
  const resumeAllAudio = () => {
    audioElementsRef.current.forEach((audio) => {
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    });
  };

  // Teardown helper
  const teardownVoice = () => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore
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
        // Ignore
      }
    });
    peersRef.current.clear();

    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
    });
    audioElementsRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    makingOfferRef.current.clear();

    setIsOpenMicEnabled(false);
    setIsSpeaking(false);
    setSpeakingUsers(new Set());
    setMutedUsers(new Set());
    setActivePeersCount(0);
  };

  // If leaving private room, teardown voice
  useEffect(() => {
    if (!isPrivateRoom) {
      if (isOpenMicEnabled) {
        socketService.leaveVoiceRoom();
        teardownVoice();
      }
    }
  }, [isPrivateRoom]);

  // Adjust volume / muted state of all remote audio elements when deafened changes
  useEffect(() => {
    audioElementsRef.current.forEach((audio) => {
      audio.muted = isDeafened;
    });
  }, [isDeafened]);

  // Create or retrieve Peer Connection for a remote user with proper track binding
  const getOrCreatePeerConnection = (remoteUserId: string): RTCPeerConnection => {
    let pc = peersRef.current.get(remoteUserId);

    if (pc && pc.signalingState !== 'closed') {
      // Ensure local tracks are attached if available
      if (localStreamRef.current) {
        const senders = pc.getSenders();
        localStreamRef.current.getAudioTracks().forEach((track) => {
          const hasSender = senders.some((s) => s.track === track || s.track?.id === track.id);
          if (!hasSender) {
            try {
              pc!.addTrack(track, localStreamRef.current!);
            } catch {
              // Ignore already added track
            }
          }
        });
      }
      return pc;
    }

    pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(remoteUserId, pc);
    setActivePeersCount(peersRef.current.size);

    // Attach local mic tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        try {
          pc!.addTrack(track, localStreamRef.current!);
        } catch {
          // Ignore
        }
      });
    }

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendVoiceSignal(remoteUserId, { candidate: event.candidate.toJSON() });
      }
    };

    // Remote audio track received -> play through DOM-attached audio element
    pc.ontrack = (event) => {
      console.log(`[VoiceChat] Remote track received from ${remoteUserId}:`, event.track.kind);
      const remoteStream =
        event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);

      let audio = audioElementsRef.current.get(remoteUserId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = `webrtc-voice-peer-${remoteUserId}`;
        audio.autoplay = true;
        (audio as any).playsInline = true;
        audio.muted = isDeafened;
        audio.volume = 1.0;
        // Mount to body so modern browser engines don't suspend or silence it
        document.body.appendChild(audio);
        audioElementsRef.current.set(remoteUserId, audio);
      }

      audio.srcObject = remoteStream;
      audio.play().catch((playErr) => {
        console.warn(`[VoiceChat] Autoplay catch for ${remoteUserId}:`, playErr.message);
      });
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[VoiceChat] ICE state with ${remoteUserId}: ${pc?.iceConnectionState}`);
      if (pc?.iceConnectionState === 'failed') {
        // Attempt ICE restart if initiator
        if (user && user.id.localeCompare(remoteUserId) > 0) {
          initiateCall(remoteUserId, true);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc?.connectionState === 'disconnected' ||
        pc?.connectionState === 'failed' ||
        pc?.connectionState === 'closed'
      ) {
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
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
      audioElementsRef.current.delete(remoteUserId);
    }

    pendingIceCandidatesRef.current.delete(remoteUserId);
    makingOfferRef.current.delete(remoteUserId);
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

  // Voice Activity Detection (VAD)
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

      // Attach new audio tracks to all existing peer connections
      peersRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        stream.getAudioTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      });

      setupVAD(stream);
      resumeAllAudio();
      socketService.joinVoiceRoom();

      // Initiate connection to all other human scholars in the room
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

  // WebRTC Call Initiation
  const initiateCall = async (remoteUserId: string, isRestart: boolean = false) => {
    try {
      const pc = getOrCreatePeerConnection(remoteUserId);
      makingOfferRef.current.set(remoteUserId, true);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        iceRestart: isRestart,
      });

      // Avoid setting local description if state changed mid-flight
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        makingOfferRef.current.set(remoteUserId, false);
        return;
      }

      await pc.setLocalDescription(offer);
      socketService.sendVoiceSignal(remoteUserId, { type: 'offer', sdp: offer.sdp });
    } catch (err: any) {
      console.warn(`[VoiceChat] Error initiating call to ${remoteUserId}:`, err.message);
    } finally {
      makingOfferRef.current.set(remoteUserId, false);
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

  // Socket Event Listeners for WebRTC signaling (with Perfect Negotiation)
  useEffect(() => {
    const socket = socketService.getSocket();

    const handleVoicePeerJoined = async ({ userId }: { userId: string }) => {
      if (!user || userId === user.id) return;
      console.log(`[VoiceChat] Remote peer joined voice: ${userId}`);
      // The peer with the alphabetically higher user ID initiates to avoid duplicate offers
      if (user.id.localeCompare(userId) > 0) {
        await initiateCall(userId);
      }
    };

    const handleVoiceSignal = async ({ senderUserId, signal }: { senderUserId: string; signal: any }) => {
      if (!isPrivateRoom || !user || senderUserId === user.id) return;

      const pc = getOrCreatePeerConnection(senderUserId);
      // Perfect Negotiation Politeness Rule: Deterministic tiebreaker based on user ID
      const isPolite = user.id.localeCompare(senderUserId) < 0;

      try {
        if (signal.type === 'offer') {
          const isMakingOffer = makingOfferRef.current.get(senderUserId) || false;
          const offerCollision = isMakingOffer || pc.signalingState !== 'stable';

          if (offerCollision) {
            if (!isPolite) {
              console.log(`[VoiceChat] Glare collision with ${senderUserId}; impolite peer ignoring offer`);
              return;
            }
            console.log(`[VoiceChat] Glare collision with ${senderUserId}; polite peer rolling back offer`);
            await pc.setLocalDescription({ type: 'rollback' });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          // Apply pending ICE candidates
          const pending = pendingIceCandidatesRef.current.get(senderUserId) || [];
          for (const cand of pending) {
            await pc.addIceCandidate(cand).catch(() => {});
          }
          pendingIceCandidatesRef.current.delete(senderUserId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketService.sendVoiceSignal(senderUserId, { type: 'answer', sdp: answer.sdp });
          resumeAllAudio();
        } else if (signal.type === 'answer') {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));

            // Apply pending ICE candidates
            const pending = pendingIceCandidatesRef.current.get(senderUserId) || [];
            for (const cand of pending) {
              await pc.addIceCandidate(cand).catch(() => {});
            }
            pendingIceCandidatesRef.current.delete(senderUserId);
            resumeAllAudio();
          }
        } else if (signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(signal.candidate).catch((e) => {
              console.warn(`[VoiceChat] Error adding candidate from ${senderUserId}:`, e.message);
            });
          } else {
            // Queue candidate until remote description is set
            const queued = pendingIceCandidatesRef.current.get(senderUserId) || [];
            queued.push(signal.candidate);
            pendingIceCandidatesRef.current.set(senderUserId, queued);
          }
        }
      } catch (signalErr: any) {
        console.warn(`[VoiceChat] Signal handling error with ${senderUserId}:`, signalErr.message);
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
