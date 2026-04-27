import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';

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

  init(roomId: string, user: { name: string; id: string }, isGuest: boolean, callbacks: {
    onParticipantsUpdate: (p: Participant[]) => void;
    onJoinRequest?: (r: JoinRequest) => void;
    onApproved?: () => void;
    onDenied?: () => void;
  }) {
    if (!this.socket) return;
    
    console.log("[MEET] Init:", roomId, "isGuest:", isGuest, "Socket connected:", this.socket.connected);

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
      console.log("[MEET] Guest joining directly:", user.name, "Room:", roomId);
      this.socket.emit("join-room", { roomId, user, isGuest: true });
      this.onApproved(); // Immediately trigger "approved" state for local UI
    } else {
      console.log("[MEET] Host joining:", roomId);
      this.socket.emit("join-room", { roomId, user, isGuest: false });
    }

    this.socket.on("new-join-request", (request: JoinRequest) => {
      console.log("[MEET] Host received join request:", request);
      this.onJoinRequest(request);
    });

    this.socket.on("request-approved", () => {
      console.log("[MEET] Approved, emitting join-room");
      this.onApproved();
      this.socket?.emit("join-room", { roomId, user, isGuest: true });
    });

    this.socket.on("request-denied", () => {
      this.onDenied();
    });

    this.socket.on("user-connected", ({ userId, user: otherUser }: { userId: string, user: any }) => {
      console.log("User connected:", otherUser.name);
      this.participants.set(userId, { id: userId, name: otherUser.name });
      this.updateParticipants();
      
      // Start WebRTC call logic here if localStream is ready
      if (this.localStream) {
          // Send signal for peer connection
      }
    });

    this.socket.on("user-disconnected", (userId: string) => {
      this.participants.delete(userId);
      this.updateParticipants();
    });

    // --- Signaling logic (Simplified WebRTC) ---
    // In a real Google Meet, we would use a more complex Mesh or SFU. 
    // Here we'll do a simple Mesh.
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
