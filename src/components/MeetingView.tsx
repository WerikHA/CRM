import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users, 
  Share2, 
  Monitor,
  Check, 
  X,
  User,
  ShieldCheck,
  MoreVertical,
  MessageSquare,
  Palette,
  Settings,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { meetingService, Participant, JoinRequest } from '../services/meetingService';
import { User as AppUser } from '../types';
import { cn } from '../lib/utils';
import Peer, { MediaConnection } from 'peerjs';
import { videoEffectService } from '../services/videoEffectService';

interface MeetingViewProps {
  roomId: string;
  currentUser: AppUser | null;
  onExit: () => void;
}

export default function MeetingView({ roomId, currentUser, onExit }: MeetingViewProps) {
  const [step, setStep] = useState<'lobby' | 'waiting' | 'meeting'>('lobby');
  const [guestName, setGuestName] = useState({ name: '', surname: '' });
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [peers, setPeers] = useState<{ [id: string]: MediaStream }>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [shareStep, setShareStep] = useState<'options' | 'link'>('options');
  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'people' | null>(null);
  const [chatMessages, setChatMessages] = useState<{id: string, sender: string, text: string, time: string}[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isBlurEnabled, setIsBlurEnabled] = useState(false);
  const [isAlreadyInCall, setIsAlreadyInCall] = useState(false);
  
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (localStream && !isMuted) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current) {
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
          analyserRef.current.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((p, c) => p + c, 0);
          const average = sum / dataArray.length;
          setAudioLevel(average);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        audioContext.close();
      };
    } else {
      setAudioLevel(0);
    }
  }, [localStream, isMuted]);

  const [linkCopiedCount, setLinkCopiedCount] = useState(0);
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);
  
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);

  // Hardware selection states
  const [devices, setDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [], audioOutputs: [] });
  
  const [selectedDevices, setSelectedDevices] = useState({
    audioInput: '',
    videoInput: '',
    audioOutput: ''
  });
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);
  const activeCalls = useRef<{ [peerId: string]: MediaConnection }>({});
  const hostId = currentUser?.id || `guest_${Math.random().toString(36).substr(2, 6)}`;
  const isHost = !!currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'OWNER');

  useEffect(() => {
    // Check if user is already in the call
    const currentName = currentUser?.name || `${guestName.name} ${guestName.surname}`.trim();
    if (currentName && participants.some(p => p.name === currentName)) {
      setIsAlreadyInCall(true);
    } else {
      setIsAlreadyInCall(false);
    }
  }, [participants, guestName, currentUser]);

  const meetingLink = `${window.location.origin}/?roomId=${roomId}`;

  // UseEffect to update local video element when stream exists
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, step, isVideoDisabled]);

  // Fetch devices when component mounts
  useEffect(() => {
    const getDevices = async () => {
      try {
        // We request a temporary stream to ensure permission-based labels are available later
        // But the user wants requests ONLY when entering.
        // So we just enumerate. If labels are empty, we'll ask for permission when they click join.
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          audioInputs: allDevices.filter(d => d.kind === 'audioinput'),
          videoInputs: allDevices.filter(d => d.kind === 'videoinput'),
          audioOutputs: allDevices.filter(d => d.kind === 'audiooutput')
        });
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    };
    getDevices();
    
    // Cleanup on unmount: stop all tracks
    return () => {
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = () => {
    videoEffectService.stopEffect();
    setIsBlurEnabled(false);
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setIsJoined(false);
  };

  const handleJoinMeeting = async () => {
    try {
      // Request permissions only now
      const constraints = {
        audio: selectedDevices.audioInput ? { deviceId: { exact: selectedDevices.audioInput } } : true,
        video: selectedDevices.videoInput ? { deviceId: { exact: selectedDevices.videoInput } } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Sync state with actual tracks being used (often maps to 'default')
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      
      setSelectedDevices(prev => ({
        ...prev,
        audioInput: prev.audioInput || (audioTrack?.getSettings().deviceId || ''),
        videoInput: prev.videoInput || (videoTrack?.getSettings().deviceId || '')
      }));

      // Update device list to get labels after permission granted
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        audioInputs: allDevices.filter(d => d.kind === 'audioinput'),
        videoInputs: allDevices.filter(d => d.kind === 'videoinput'),
        audioOutputs: allDevices.filter(d => d.kind === 'audiooutput')
      });

      const userData = currentUser ? {
        id: currentUser.id,
        name: currentUser.name
      } : {
        id: hostId,
        name: `${guestName.name} ${guestName.surname}`
      };

      if (!currentUser) {
        setStep('waiting');
      } else {
        setStep('meeting');
        setIsJoined(true);
      }

      meetingService.init(roomId, userData, !currentUser, {
        onParticipantsUpdate: (p) => {
          setParticipants(p);
          p.forEach(participant => {
            if (participant.id !== userData.id && !peers[participant.id]) {
               if (peerInstance.current && stream) {
                  const call = peerInstance.current.call(participant.id, stream);
                  activeCalls.current[participant.id] = call;
                  call.on('stream', (remoteStream) => {
                    setPeers(prev => ({ ...prev, [participant.id]: remoteStream }));
                  });
               }
            }
          });
        },
        onJoinRequest: (req) => setJoinRequests(prev => [...prev, req]),
        onApproved: () => {
          console.log("[MEET] [VIEW] Recebido callback onApproved. Alterando step para 'meeting'.");
          setStep('meeting');
          setIsJoined(true);
          
          const peer = new Peer(userData.id, {
            host: window.location.hostname,
            port: parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80),
            path: '/',
            secure: window.location.protocol === 'https:'
          });
          peerInstance.current = peer;
    
          peer.on('call', (call) => {
            activeCalls.current[call.peer] = call;
            call.answer(stream);
            call.on('stream', (userStream) => {
              setPeers(prev => ({ ...prev, [call.peer]: userStream }));
            });
          });
        },
        onDenied: () => {
          alert("Sua entrada foi recusada pelo anfitrião.");
          stopAllMedia();
          onExit();
        }
      });

      if (currentUser) {
          const peer = new Peer(userData.id, {
            host: window.location.hostname,
            port: parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80),
            path: '/',
            secure: window.location.protocol === 'https:'
          });
          peerInstance.current = peer;
    
          peer.on('call', (call) => {
            activeCalls.current[call.peer] = call;
            call.answer(stream);
            call.on('stream', (userStream) => {
              setPeers(prev => ({ ...prev, [call.peer]: userStream }));
            });
          });
      }
    } catch (err: any) {
      alert("Erro ao acessar câmera/microfone: " + err.message);
    }
  };

  const replaceTracks = async (newStream: MediaStream, type: 'video' | 'audio') => {
    const newTrack = type === 'video' ? newStream.getVideoTracks()[0] : newStream.getAudioTracks()[0];
    if (!newTrack) return;

    // Update participants
    (Object.values(activeCalls.current) as MediaConnection[]).forEach(call => {
      const pc = call.peerConnection;
      if (pc) {
        const senders = pc.getSenders();
        const sender = senders.find(s => s.track?.kind === type);
        if (sender) {
          sender.replaceTrack(newTrack);
        }
      }
    });
  };

  const switchCamera = async (deviceId: string) => {
    if (!localStream) return;
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: selectedDevices.audioInput ? { deviceId: { exact: selectedDevices.audioInput } } : true
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      let finalStream = newStream;
      if (isBlurEnabled) {
        // Re-apply blur to the new camera stream
        videoEffectService.stopEffect();
        const blurredStream = await videoEffectService.startEffect(newStream);
        finalStream = blurredStream;
      }

      // Replace video tracks in peers
      await replaceTracks(finalStream, 'video');

      // Stop old video tracks
      localStream.getVideoTracks().forEach(t => t.stop());
      
      // Update original stream ref if blur is enabled
      if (isBlurEnabled) {
          originalStreamRef.current = newStream;
      } else {
          originalStreamRef.current = null;
      }

      // Merge streams
      const audioTracks = localStream.getAudioTracks();
      const videoTracks = finalStream.getVideoTracks();
      const updatedStream = new MediaStream([...audioTracks, ...videoTracks]);
      
      setLocalStream(updatedStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = updatedStream;
    } catch (err: any) {
      console.error("Error switching camera:", err);
      alert("Não foi possível trocar a câmera: " + err.message);
    }
  };

  const switchMic = async (deviceId: string) => {
    if (!localStream) return;
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: selectedDevices.videoInput ? { deviceId: { exact: selectedDevices.videoInput } } : true
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Replace audio tracks in peers
      await replaceTracks(newStream, 'audio');
      
      // Stop old audio tracks
      localStream.getAudioTracks().forEach(t => t.stop());
      
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = newStream.getAudioTracks();
      const updatedStream = new MediaStream([...videoTracks, ...audioTracks]);
      
      setLocalStream(updatedStream);
    } catch (err: any) {
      console.error("Error switching mic:", err);
      alert("Não foi possível trocar o microfone: " + err.message);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const newState = !isMuted;
      localStream.getAudioTracks().forEach(track => track.enabled = !newState);
      setIsMuted(newState);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const newState = !isVideoDisabled;
      localStream.getVideoTracks().forEach(track => track.enabled = !newState);
      setIsVideoDisabled(newState);
    }
  };

  const toggleBlur = async () => {
    if (!localStream) return;

    if (isBlurEnabled) {
      // Disable blur
      videoEffectService.stopEffect();
      
      if (originalStreamRef.current) {
        const videoTrack = originalStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          await replaceTracks(originalStreamRef.current, 'video');
          
          const audioTracks = localStream.getAudioTracks();
          const newStream = new MediaStream([...audioTracks, videoTrack]);
          setLocalStream(newStream);
          if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
        }
      }
      setIsBlurEnabled(false);
    } else {
      // Enable blur
      try {
        // Backup original stream if not already backed up
        if (!originalStreamRef.current) {
          originalStreamRef.current = new MediaStream(localStream.getTracks());
        }

        const blurredStream = await videoEffectService.startEffect(localStream);
        await replaceTracks(blurredStream, 'video');
        
        const audioTracks = localStream.getAudioTracks();
        const videoTrack = blurredStream.getVideoTracks()[0];
        const newStream = new MediaStream([...audioTracks, videoTrack]);
        
        setLocalStream(newStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
        setIsBlurEnabled(true);
      } catch (err) {
        console.error("Error enabling blur:", err);
        alert("Não foi possível ativar o desfoque de fundo.");
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      
      // Revert to camera stream
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      
      // Update Peers: Switch back to camera
      if (peerInstance.current && localStream) {
        participants.forEach(p => {
          const targetId = p.id;
          if (targetId !== (currentUser?.id || hostId)) {
            const call = peerInstance.current!.call(targetId, localStream);
            call.on('stream', (remoteStream) => {
              setPeers(prev => ({ ...prev, [targetId]: remoteStream }));
            });
          }
        });
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // When screen share stops via browser UI
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
          }
        };

        // Update Peers: Replace stream with screen
        if (peerInstance.current) {
          participants.forEach(p => {
            const targetId = p.id;
            if (targetId !== (currentUser?.id || hostId)) {
              const call = peerInstance.current!.call(targetId, stream);
              call.on('stream', (remoteStream) => {
                setPeers(prev => ({ ...prev, [targetId]: remoteStream }));
              });
            }
          });
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          console.log("Usuário cancelou o compartilhamento de tela.");
        } else {
          console.error("Screen share error:", err);
          alert("Erro ao compartilhar tela: " + err.message);
        }
      }
    }
  };

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(meetingLink);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = meetingLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      if (linkCopiedCount < 10) {
        setShowCopiedFeedback(true);
        setLinkCopiedCount(prev => prev + 1);
        setTimeout(() => setShowCopiedFeedback(false), 3000);
      } else {
        alert("Link da reunião copiado!");
      }
    } catch (err) {
      console.error("Falha ao copiar link:", err);
      alert("Não foi possível copiar o link automaticamente. Copie este link: " + meetingLink);
    }
  };

  const sendEmailInvite = () => {
    const subject = encodeURIComponent("Convite para Videochamada - Amplifica CRM");
    const body = encodeURIComponent(`Olá,\n\nVocê foi convidado para participar de uma videochamada.\n\nClique no link abaixo para entrar:\n${meetingLink}\n\nAtenciosamente,\nEquipe Amplifica`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sender: currentUser?.name || `${guestName.name} ${guestName.surname}`,
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  if (step === 'lobby') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-950 p-4"
      >
        <div className="w-full max-w-md bg-zinc-900 border border-white/5 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          {/* Settings Gear in Lobby */}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all h-10 w-10 flex items-center justify-center"
            title="Ajustes de Áudio e Vídeo"
          >
            <Settings size={20} />
          </button>

          <div className="flex flex-col items-center gap-4 mb-8 text-center">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center ring-1 ring-indigo-500/20">
              <Video className="w-10 h-10 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Participar da Reunião</h1>
            <p className="text-gray-400 text-sm">
              {currentUser ? `Olá ${currentUser.name}, pronto para entrar?` : "Insira seus dados para pedir autorização"}
            </p>
          </div>

          <div className="space-y-4">
            {!currentUser && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Nome</label>
                  <input 
                    type="text"
                    value={guestName.name}
                    onChange={(e) => setGuestName(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    placeholder="Ex: João"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Sobrenome</label>
                  <input 
                    type="text"
                    value={guestName.surname}
                    onChange={(e) => setGuestName(prev => ({ ...prev, surname: e.target.value }))}
                    className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    placeholder="Ex: Silva"
                  />
                </div>
              </div>
            )}

            <button 
              disabled={(!currentUser && (!guestName.name || !guestName.surname)) || isAlreadyInCall}
              onClick={handleJoinMeeting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 mt-4"
            >
              {isAlreadyInCall ? "Você já está nesta chamada" : "Entrar na Reunião"}
            </button>
            
            <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-medium">
              Sua câmera e microfone serão solicitados ao entrar
            </p>

            {isAlreadyInCall && (
              <p className="text-rose-400 text-[10px] text-center font-bold mt-2 uppercase tracking-wider">
                Detectamos que você já está nesta reunião
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (step === 'waiting') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        {/* Local Preview in Waiting Screen */}
        <div className="w-full max-w-lg aspect-video bg-zinc-900 rounded-[40px] overflow-hidden border border-white/10 shadow-2xl mb-8 relative group">
          {localStream ? (
            <video 
              ref={localVideoRef}
              autoPlay 
              muted 
              playsInline 
              className={cn("w-full h-full object-cover", isVideoDisabled && "hidden")} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <Video size={48} className="text-white/20 animate-pulse" />
            </div>
          )}
          
          {isVideoDisabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xl">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                <VideoOff size={32} className="text-white/20" />
              </div>
            </div>
          )}

          {/* Audio feedback visualization (Waiting Room) */}
          {!isMuted && (
            <div className="absolute bottom-6 left-6 flex items-end gap-0.5 h-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: `${Math.max(20, Math.min(100, (audioLevel / 50) * (50 + Math.random() * 50)))}%` 
                  }}
                  className="w-1 bg-indigo-500 rounded-full"
                />
              ))}
            </div>
          )}

          {/* Quick Controls in Waiting Screen */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/40 backdrop-blur-xl p-3 rounded-3xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all">
            <button 
              onClick={toggleMute}
              className={cn("p-2 rounded-xl transition-all", isMuted ? "bg-rose-500/20 text-rose-500" : "bg-white/5 text-white hover:bg-white/10")}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button 
              onClick={toggleVideo}
              className={cn("p-2 rounded-xl transition-all", isVideoDisabled ? "bg-rose-500/20 text-rose-500" : "bg-white/5 text-white hover:bg-white/10")}
            >
              {isVideoDisabled ? <VideoOff size={18} /> : <Video size={18} />}
            </button>
            <button 
              onClick={toggleBlur}
              className={cn("p-2 rounded-xl transition-all", isBlurEnabled ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-white hover:bg-white/10")}
              title="Alternar Desfoque de Fundo"
            >
              <Palette size={18} />
            </button>
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Aguardando autorização...</h2>
          <p className="text-gray-400 text-center max-w-sm">O anfitrião da reunião foi notificado e você entrará assim que ele aprovar.</p>
          
          <button 
            onClick={() => {
              stopAllMedia();
              onExit();
            }}
            className="mt-12 px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-2xl font-bold transition-all border border-white/5"
          >
            Cancelar Solicitação
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
      {/* Top Bar */}
      <div className="h-16 px-6 flex items-center justify-between text-white bg-black/50 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Ao Vivo</div>
          <h2 className="text-sm font-medium opacity-80">Reunião: {roomId}</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setShareStep('options');
              setShowShareModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20"
          >
            <Share2 size={14} /> Compartilhar
          </button>
          {isHost && (
            <div className="relative">
              <Users size={20} className="text-gray-400" />
              {joinRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                  {joinRequests.length}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Video Grid and Sidebars */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 pt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
          {/* Local Stream */}
          <div className={cn(
            "relative aspect-video bg-gray-900 rounded-3xl overflow-hidden border-2 group shadow-2xl transition-all",
            isBlurEnabled ? "border-emerald-500/50" : "border-indigo-500/30"
          )}>
            <video 
              ref={localVideoRef}
              autoPlay 
              muted 
              playsInline
              className={cn(
                "w-full h-full object-cover transition-all",
                isVideoDisabled && "opacity-0"
              )}
            />
            {isBlurEnabled && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-emerald-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30">
                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Efeito Ativo</p>
                    </div>
                </div>
            )}
            {isVideoDisabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center">
                  <User size={48} className="text-gray-600" />
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Você</span>
              {!isMuted && (
                <div className="flex items-end gap-0.5 h-3 ml-1">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: `${Math.max(20, Math.min(100, (audioLevel / 40) * 100))}%` }}
                      className="w-0.5 bg-indigo-400 rounded-full"
                    />
                  ))}
                </div>
              )}
              {isMuted && <MicOff size={12} className="text-rose-500" />}
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="p-2 bg-black/40 rounded-full text-white hover:bg-black/60"><MoreVertical size={16} /></button>
            </div>
          </div>

          {/* Remote Peers */}
          {Object.entries(peers).map(([peerId, stream]: [string, any], index: number) => (
            <div key={`${peerId}-${index}`} className="relative aspect-video bg-gray-900 rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
               <RemoteVideo stream={stream} audioOutputId={selectedDevices.audioOutput} />
               <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-xs font-medium text-white">Participante</span>
               </div>
            </div>
          ))}

          {/* Placeholder for others */}
          {participants.length === 0 && Object.keys(peers).length === 0 && (
            <div className="aspect-video bg-gray-900/50 rounded-3xl flex flex-col items-center justify-center border border-dashed border-gray-800 p-8 text-center space-y-4">
               <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                  <Users className="text-gray-600" />
               </div>
               <p className="text-gray-500 text-sm">Aguardando outros participantes...</p>
            </div>
          )}
        </div>

        {/* Sidebars */}
        <AnimatePresence>
          {activeSidebar && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 h-full bg-gray-900 border-l border-gray-800 pt-24 flex flex-col z-20"
            >
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                  {activeSidebar === 'chat' ? 'Chat Mensagens' : 'Participantes'}
                </h3>
                <button onClick={() => setActiveSidebar(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
              </div>

              {activeSidebar === 'chat' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.map((m) => (
                      <div key={m.id} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-400">{m.sender}</span>
                          <span className="text-[9px] text-gray-500">{m.time}</span>
                        </div>
                        <div className="bg-gray-800 p-3 rounded-2xl rounded-tl-none text-sm text-gray-200">
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {chatMessages.length === 0 && (
                        <p className="text-center text-gray-500 text-xs mt-10">Envie uma mensagem para todos na chamada</p>
                    )}
                  </div>
                  <div className="p-4 bg-gray-800/50 border-t border-gray-800">
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={newMessage}
                         onChange={(e) => setNewMessage(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                         placeholder="Mensagem..."
                         className="flex-1 bg-gray-950 border-none rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                       />
                       <button 
                         onClick={sendMessage}
                         className="p-2 bg-indigo-600 text-white rounded-xl"
                       >
                         <Check size={16} />
                       </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                     <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {currentUser?.name?.[0] || 'V'}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Você'}</p>
                        <p className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold">Anfitrião</p>
                     </div>
                  </div>
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-2xl border border-white/5">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 text-xs font-bold">
                            {p.name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-300 truncate">{p.name}</p>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Join Requests Overlay (for Host) */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Convidar Pessoas</h3>
                <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-4">
                {shareStep === 'options' ? (
                  <>
                    <button 
                      onClick={sendEmailInvite}
                      className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl flex items-center gap-4 transition-all group"
                    >
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        <MessageSquare size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Enviar por E-mail</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Usar meu app de email</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setShareStep('link')}
                      className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl flex items-center gap-4 transition-all group"
                    >
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Share2 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Gerar Link Direto</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Link para acesso rápido</p>
                      </div>
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-950 rounded-2xl border border-gray-800">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Link da Reunião</p>
                      <p className="text-xs text-indigo-400 break-all font-mono bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 mb-4">{meetingLink}</p>
                      <button 
                        onClick={copyToClipboard}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all relative overflow-hidden"
                      >
                        <AnimatePresence mode="wait">
                          {showCopiedFeedback ? (
                            <motion.div 
                              key="copied"
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -20, opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                               <Check size={16} /> Link Copiado!
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="copy"
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -20, opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                               <Share2 size={16} /> Copiar Link agora
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                    <button 
                      onClick={() => setShareStep('options')}
                      className="w-full py-2 text-indigo-400 text-xs font-bold hover:text-indigo-300 transition-colors"
                    >
                      Voltar para opções
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isHost && joinRequests.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-sm"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-indigo-500/30 overflow-hidden">
               <div className="p-4 bg-indigo-600 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <ShieldCheck size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">Pedidos de Entrada</span>
                  </div>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-white">{joinRequests.length} Novo(s)</span>
               </div>
               <div className="max-h-60 overflow-y-auto">
                  {joinRequests.map(req => (
                    <div key={req.id} className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{req.name} {req.surname}</span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest">Visitante Externo</span>
                       </div>
                       <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              meetingService.approve(roomId, req.id);
                              setJoinRequests(prev => prev.filter(r => r.id !== req.id));
                            }}
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md"
                            title="Aprovar"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              meetingService.deny(roomId, req.id);
                              setJoinRequests(prev => prev.filter(r => r.id !== req.id));
                            }}
                            className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md"
                            title="Negar"
                          >
                            <X size={16} />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">Equipamentos</h3>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* Camera Selection */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                    <Video size={12} /> Câmera
                  </label>
                  <select 
                    value={selectedDevices.videoInput}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedDevices(prev => ({ ...prev, videoInput: id }));
                      if (isJoined) switchCamera(id);
                    }}
                    className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Padrão do Sistema (Câmera)</option>
                    {devices.videoInputs.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Câmera ${d.deviceId.substr(0, 5)}`}</option>
                    ))}
                  </select>
                </div>

                {/* Microphone Selection */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                    <Mic size={12} /> Microfone
                  </label>
                  <select 
                    value={selectedDevices.audioInput}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedDevices(prev => ({ ...prev, audioInput: id }));
                      if (isJoined) switchMic(id);
                    }}
                    className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Padrão do Sistema (Microfone)</option>
                    {devices.audioInputs.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Microfone ${d.deviceId.substr(0, 5)}`}</option>
                    ))}
                  </select>
                </div>

                {/* Audio Output Selection */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                    <Volume2 size={12} /> Saída de Áudio
                  </label>
                  <select 
                    value={selectedDevices.audioOutput}
                    onChange={(e) => setSelectedDevices(prev => ({ ...prev, audioOutput: e.target.value }))}
                    className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Padrão do Sistema (Saída)</option>
                    {devices.audioOutputs.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Saída ${d.deviceId.substr(0, 5)}`}</option>
                    ))}
                  </select>
                </div>

                {/* VU Meter in Settings */}
                {isJoined && !isMuted && (
                  <div className="pt-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 mb-2 block">
                      Teste de Volume
                    </label>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ width: `${Math.min(100, (audioLevel / 50) * 100)}%` }}
                        className={cn(
                          "h-full transition-colors",
                          audioLevel > 40 ? "bg-rose-500" : audioLevel > 20 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Control Bar */}
      <div className="h-24 px-8 flex items-center justify-center gap-4 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 relative">
        <button 
          onClick={toggleMute}
          className={cn(
            "group flex flex-col items-center gap-1.5 transition-all p-3 rounded-2xl",
            isMuted ? "bg-rose-500 text-white" : "bg-zinc-800 text-white hover:bg-zinc-700"
          )}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">{isMuted ? "Mudo" : "Áudio"}</span>
        </button>

        <button 
          onClick={toggleVideo}
          className={cn(
            "group flex flex-col items-center gap-1.5 transition-all p-3 rounded-2xl",
            isVideoDisabled ? "bg-rose-500 text-white" : "bg-zinc-800 text-white hover:bg-zinc-700"
          )}
        >
          {isVideoDisabled ? <VideoOff size={22} /> : <Video size={22} />}
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">{isVideoDisabled ? "Off" : "Vídeo"}</span>
        </button>

        <button 
          onClick={toggleBlur}
          className={cn(
            "group flex flex-col items-center gap-1.5 transition-all p-3 rounded-2xl",
            isBlurEnabled ? "bg-emerald-500 text-white" : "bg-zinc-800 text-white hover:bg-zinc-700"
          )}
        >
          <Palette size={22} />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">{isBlurEnabled ? "Normal" : "Desfoque"}</span>
        </button>

        <button 
          onClick={toggleScreenShare}
          className={cn(
            "group flex flex-col items-center gap-1.5 transition-all p-3 rounded-2xl",
            isScreenSharing ? "bg-indigo-600 text-white" : "bg-zinc-800 text-white hover:bg-zinc-700"
          )}
        >
          <Monitor size={22} />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">{isScreenSharing ? "Parar" : "Tela"}</span>
        </button>

        <button 
          onClick={() => setShowSettingsModal(true)}
          className={cn(
            "group flex flex-col items-center gap-1.5 transition-all p-3 rounded-2xl bg-zinc-800 text-white hover:bg-zinc-700"
          )}
        >
          <Settings size={22} />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Ajustes</span>
        </button>

        <div className="w-[1px] h-10 bg-white/10 mx-2" />

        <button 
           onClick={() => {
             stopAllMedia();
             meetingService.disconnect();
             onExit();
           }}
           className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl flex items-center gap-3 font-bold transition-all shadow-lg shadow-rose-900/40 border border-rose-500/30 active:scale-95"
        >
          <PhoneOff size={20} />
          <span>Sair da Chamada</span>
        </button>

        <div className="absolute right-8 hidden lg:flex items-center gap-2">
           <button 
             onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')}
             className={cn(
               "text-gray-400 hover:text-white transition-colors flex flex-col items-center gap-1 group px-4 py-2 rounded-xl",
               activeSidebar === 'chat' && "bg-indigo-500/10 text-indigo-400 shadow-sm"
             )}
           >
              <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Chat</span>
           </button>
           <button 
             onClick={() => setActiveSidebar(activeSidebar === 'people' ? null : 'people')}
             className={cn(
               "text-gray-400 hover:text-white transition-colors flex flex-col items-center gap-1 group px-4 py-2 rounded-xl",
               activeSidebar === 'people' && "bg-indigo-500/10 text-indigo-400 shadow-sm"
             )}
           >
              <Users size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Pessoas</span>
           </button>
        </div>
      </div>
    </div>
  );
}

function RemoteVideo({ stream, audioOutputId }: { stream: MediaStream, audioOutputId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Handle audio output switching if supported
      if (audioOutputId && (videoRef.current as any).setSinkId) {
        (videoRef.current as any).setSinkId(audioOutputId)
          .catch((err: any) => console.error("Error setting sink ID:", err));
      }
    }
  }, [stream, audioOutputId]);

  return (
    <video 
      ref={videoRef}
      autoPlay 
      playsInline
      className="w-full h-full object-cover"
    />
  );
}
