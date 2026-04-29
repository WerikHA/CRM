import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';
import { meetLogService } from './meetLogService';

export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isHost?: boolean;
}

export interface JoinRequest {
  id: string;
  name: string;
  surname: string;
}

class MeetingService {
  private socket: Socket | null = null;
  private peer: Peer | null = null;
  private localStream: MediaStream | null = null;
  private participants: Map<string, Participant> = new Map();
  private onParticipantsUpdate: (participants: Participant[]) => void = () => {};
  private onJoinRequest: (request: JoinRequest) => void = () => {};
  private onApproved: () => void = () => {};
  private onDenied: () => void = () => {};

  constructor() {
    this.socket = io();
  }

  async setupLocalMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return this.localStream;
    } catch (err) {
      console.error("Local media error:", err);
      // Fallback for audio only if camera fails
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        return this.localStream;
      } catch (e) {
        throw new Error("Não foi possível acessar áudio ou vídeo.");
      }
    }
  }

  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  init(roomId: string, user: { name: string; id: string }, isGuest: boolean, callbacks: {
    onParticipantsUpdate: (p: Participant[]) => void;
    onJoinRequest?: (r: JoinRequest) => void;
    onApproved?: () => void;
    onDenied?: () => void;
  }) {
    if (!this.socket) return;
    
    meetLogService.add(`[MEET] Init: ${roomId}, isGuest: ${isGuest}, Socket connected: ${!!this.socket?.connected}`);

    // Reset listeners to avoid duplicates on re-init
    this.socket.off("new-join-request");
    this.socket.off("request-approved");
    this.socket.off("request-denied");
    this.socket.off("user-connected");
    this.socket.off("user-disconnected");

    this.onParticipantsUpdate = callbacks.onParticipantsUpdate;
    this.onJoinRequest = callbacks.onJoinRequest || (() => {});
    this.onApproved = callbacks.onApproved || (() => {});
    this.onDenied = callbacks.onDenied || (() => {});

    if (isGuest) {
      meetLogService.add(`[MEET] Requesting join for guest: ${user.name}, Room: ${roomId}`);
      this.socket.emit("request-join", { roomId, guestInfo: user });
    } else {
      meetLogService.add(`[MEET] Host joining: ${roomId}`);
      this.socket.emit("join-room", {roomId, user, isGuest: false});
    }

    this.socket.on("new-join-request", (request: JoinRequest) => {
      meetLogService.add(`[MEET] Host received join request: ${JSON.stringify(request)}`);
      this.onJoinRequest(request);
    });

    this.socket.on("request-approved", () => {
      meetLogService.add(`[MEET] [SERVICE] Recebido evento: request-approved. Chamando onApproved.`);
      this.onApproved();
      meetLogService.add(`[MEET] [SERVICE] Emitindo join-room por request-approved.`);
      this.socket?.emit("join-room", { roomId, user, isGuest: true });
    });

    this.socket.on("request-denied", () => {
      meetLogService.add(`[MEET] [SERVICE] Recebido evento: request-denied.`);
      this.onDenied();
    });

    this.socket.on("user-connected", ({ userId, user: otherUser }: { userId: string, user: any }) => {
      meetLogService.add(`[MEET] User connected: ${otherUser.name}, ID: ${userId}`);
      this.participants.set(userId, { id: userId, name: otherUser.name });
      this.updateParticipants();
      
      // Start WebRTC call logic here if localStream is ready
      if (this.localStream && this.peer) {
          meetLogService.add(`[MEET] Iniciando chamada para: ${userId}`);
          const call = this.peer.call(userId, this.localStream);
          call.on('error', (err) => meetLogService.add(`[MEET] Erro na chamada para ${userId}: ${err.message}`));
          call.on('stream', (userStream) => {
              meetLogService.add(`[MEET] Stream recebido de: ${userId}`);
              this.participants.get(userId)!.stream = userStream;
              this.updateParticipants();
          });
      } else {
        meetLogService.add(`[MEET] Não foi possível iniciar chamada para ${userId}. localStream: ${!!this.localStream}, peer: ${!!this.peer}`);
      }
    });

    this.socket.on("user-disconnected", (userId: string) => {
      meetLogService.add(`[MEET] User disconnected: ${userId}`);
      this.participants.delete(userId);
      this.updateParticipants();
    });
  }

  initPeer(userId: string) {
    // Relying on standard peer.js public server which is more reliable for simple apps behind proxies/Cloud Run
    if (this.peer) {
        meetLogService.add(`[MEET] Peer já existe, tentando destruir.`);
        this.peer.destroy();
    }
    this.peer = new Peer(userId);
    meetLogService.add(`[MEET] Peer iniciado para ID: ${userId}`);

    this.peer.on('error', (err) => meetLogService.add(`[MEET] Erro no Peer: ${err.type} - ${err.message}`));

    this.peer.on('call', (call) => {
        meetLogService.add(`[MEET] Chamada recebida de: ${call.peer}`);
        if (this.localStream) {
            meetLogService.add(`[MEET] Respondendo chamada de: ${call.peer}`);
            call.answer(this.localStream);
            call.on('error', (err) => meetLogService.add(`[MEET] Erro na chamada recebida de ${call.peer}: ${err.message}`));
            call.on('stream', (userStream) => {
                meetLogService.add(`[MEET] Stream recebido via 'call' de: ${call.peer}`);
                if (this.participants.has(call.peer)) {
                  this.participants.get(call.peer)!.stream = userStream;
                  this.updateParticipants();
                } else {
                  meetLogService.add(`[MEET] Participante não encontrado: ${call.peer}`);
                }
            });
        } else {
            meetLogService.add(`[MEET] Não foi possível responder a chamada de ${call.peer}. localStream: ${!!this.localStream}`);
        }
    });
  }

  private updateParticipants() {
    this.onParticipantsUpdate(Array.from(this.participants.values()));
  }

  approve(roomId: string, guestId: string) {
    this.socket?.emit("approve-request", { roomId, guestId });
  }

  deny(roomId: string, guestId: string) {
    this.socket?.emit("deny-request", { roomId, guestId });
  }

  disconnect() {
    this.socket?.disconnect();
    this.localStream?.getTracks().forEach(track => track.stop());
  }
}

export const meetingService = new MeetingService();
