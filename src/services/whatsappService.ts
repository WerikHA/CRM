import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  WAConnectionState,
  decryptPollVote,
  jidNormalizedUser,
  getAggregateVotesInPollMessage,
  updateMessageWithPollUpdate,
  getKeyAuthor,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { EventEmitter } from "events";
import pino from "pino";
import crypto from "crypto";
import NodeCache from "node-cache";

const logger = pino({ level: "silent" });
const msgRetryCounterCache = new NodeCache();

interface SentPollData {
  orderId: string;
  pollName: string;
  options: string[];
  messageSecretHex: string;
  creatorJid: string;
  fullMessage?: any; // Storing the full message for aggregation
}

export class WhatsAppService extends EventEmitter {
  private sessions: Record<string, any> = {};
  private qrDataUrls: Record<string, string | null> = {};
  private sessionStatus: Record<string, "disconnected" | "qr" | "connected"> = {};
  private authBaseDir = path.join(process.cwd(), "whatsapp_auth_sessions");
  private pollStorePath = path.join(process.cwd(), "whatsapp_polls.json");
  private pollStore: Record<string, SentPollData> = {};
  private initializingSessions: Set<string> = new Set();
  public onMessageCallback?: (phone: string, text: string) => void;

  constructor() {
    super();
    this.loadPollStore();
    this.initAllSessions();
  }

  private async initAllSessions() {
    if (!fs.existsSync(this.authBaseDir)) {
      fs.mkdirSync(this.authBaseDir, { recursive: true });
      return;
    }
    const dirs = fs.readdirSync(this.authBaseDir);
    for (const d of dirs) {
      if (d.startsWith("auth_")) {
        const ownerId = d.replace("auth_", "");
        this.initSession(ownerId);
      }
    }
  }

  private loadPollStore() {
    if (fs.existsSync(this.pollStorePath)) {
      try {
        this.pollStore = JSON.parse(
          fs.readFileSync(this.pollStorePath, "utf-8"),
        );
      } catch (e) {}
    }
  }

  private savePollStore() {
    fs.writeFileSync(this.pollStorePath, JSON.stringify(this.pollStore));
  }

  public async initSession(ownerId: string) {
    if (this.initializingSessions.has(ownerId)) return;
    this.initializingSessions.add(ownerId);

    const sessionAuthDir = path.join(this.authBaseDir, `auth_${ownerId}`);

    try {
      console.log(`[WHATSAPP] Iniciando sessão ${ownerId}...`);

      if (this.sessions[ownerId]) {
        try {
          this.sessions[ownerId].ev.removeAllListeners();
          this.sessions[ownerId].end(undefined);
        } catch (e) {}
        delete this.sessions[ownerId];
      }

      if (!fs.existsSync(sessionAuthDir)) {
        fs.mkdirSync(sessionAuthDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionAuthDir);
      const { version, isLatest } = await fetchLatestBaileysVersion();

      const socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        browser: Browsers.ubuntu("Chrome"),
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 5000,
        msgRetryCounterCache,
        logger,
        qrTimeout: 180000,
        generateHighQualityLinkPreview: false,
        linkPreviewImageThumbnailWidth: 192,
      });

      this.sessions[ownerId] = socket;

      socket.ev.on("creds.update", saveCreds);

      socket.ev.on(
        "connection.update",
        (
          update: Partial<{
            connection: WAConnectionState;
            lastDisconnect: any;
            qr: string;
          }>,
        ) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            console.log(`[WHATSAPP] QR Code recebido para ${ownerId}`);
            this.sessionStatus[ownerId] = "qr";
            QRCode.toDataURL(qr)
              .then((url) => {
                this.qrDataUrls[ownerId] = url;
                this.emit("update", {
                  ownerId,
                  status: this.sessionStatus[ownerId],
                  qr: this.qrDataUrls[ownerId],
                });
              })
              .catch((err) => {
                console.error("[WHATSAPP] Erro ao gerar QR:", err);
              });
          }

          if (connection === "close") {
            const error = lastDisconnect?.error;
            const statusCode = (error as any)?.output?.statusCode;
            const message = error?.message || error?.stack || "";
            const isServerTerminated = message.includes("Connection Terminated by Server") || 
                                     message.includes("Stream Errored") ||
                                     statusCode === 440 || 
                                     statusCode === 515 || 
                                     statusCode === 408;
            
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(
              `[WHATSAPP] Sessão ${ownerId} fechada. Código: ${statusCode}. Reconnecting: ${shouldReconnect}`,
            );

            this.sessionStatus[ownerId] = "disconnected";
            this.qrDataUrls[ownerId] = null;
            this.emit("update", { ownerId, status: this.sessionStatus[ownerId] });

            if (!shouldReconnect) {
              console.log(`[WHATSAPP] Sessão ${ownerId} deslogada. Limpando credenciais...`);
              this.clearAuth(ownerId);
              delete this.sessions[ownerId];
            }

            this.initializingSessions.delete(ownerId);
            
            if (shouldReconnect) {
              const delay = isServerTerminated ? 5000 : 3000;
              setTimeout(() => this.initSession(ownerId), delay);
            }
          } else if (connection === "open") {
            console.log(`[WHATSAPP] Sessão ${ownerId} conectada com sucesso!`);
            this.sessionStatus[ownerId] = "connected";
            this.qrDataUrls[ownerId] = null;
            this.emit("update", { ownerId, status: this.sessionStatus[ownerId] });
            this.initializingSessions.delete(ownerId);
          }
        },
      );

      socket.ev.on("messages.upsert", async (m: any) => {
        if (m.type !== "notify") return;
        for (const msg of m.messages) {
          if (msg.key.fromMe) continue;
          const content = msg.message;

          if (content?.pollUpdateMessage) {
            const update = content.pollUpdateMessage;
            const pollMsgId = update.pollCreationMessageKey?.id;
            
            if (pollMsgId && this.pollStore[pollMsgId]) {
              const context = this.pollStore[pollMsgId];
              try {
                const meId = jidNormalizedUser(socket.user?.id);
                const meLid = (socket.user as any)?.lid ? jidNormalizedUser((socket.user as any)?.lid) : undefined;
                const creationMsgKey = update.pollCreationMessageKey;
                const pollEncKey = Buffer.from(context.messageSecretHex, "hex");

                if (!pollEncKey) continue;

                const voterJid = jidNormalizedUser(msg.key.participant || msg.key.remoteJid || '');
                const pollCreatorJid = jidNormalizedUser(context.creatorJid);

                let voteMsg: any = null;
                const combos = [{ creator: pollCreatorJid, voter: voterJid }];
                if (meLid) combos.push({ creator: meLid, voter: voterJid });

                for (const combo of combos) {
                  try {
                    voteMsg = decryptPollVote(update.vote, {
                      pollCreatorJid: combo.creator,
                      pollMsgId: creationMsgKey.id,
                      pollEncKey,
                      voterJid: combo.voter,
                    });
                    if (voteMsg) break;
                  } catch (err) {}
                }

                if (!voteMsg) continue;

                if (context.fullMessage) {
                  updateMessageWithPollUpdate(context.fullMessage, {
                    pollUpdateMessageKey: msg.key,
                    vote: voteMsg,
                    senderTimestampMs: Number(update.senderTimestampMs || Date.now()),
                  });
                }

                if (voteMsg.selectedOptions && voteMsg.selectedOptions.length > 0) {
                  const selectedHash = Buffer.from(voteMsg.selectedOptions[0]).toString("hex");
                  let selectedOption = null;
                  
                  for (const opt of context.options) {
                    const optHash = crypto.createHash("sha256").update(Buffer.from(opt)).digest("hex");
                    if (optHash === selectedHash) {
                      selectedOption = opt;
                      break;
                    }
                  }

                  if (selectedOption) {
                    this.emit("pollVote", {
                      ownerId,
                      orderId: context.orderId,
                      option: selectedOption,
                      phone: msg.key.remoteJid?.split("@")[0],
                    });
                  }
                }

                if (context.fullMessage) this.savePollStore();
              } catch (e) {
                console.error("[WHATSAPP] Erro ao processar voto", e);
              }
            }
          }
        }
      });
    } catch (err) {
      console.error(`[WHATSAPP] Falha ao iniciar sessão ${ownerId}:`, err);
      this.initializingSessions.delete(ownerId);
      setTimeout(() => this.initSession(ownerId), 10000);
    }
  }

  private clearAuth(ownerId: string) {
    const sessionAuthDir = path.join(this.authBaseDir, `auth_${ownerId}`);
    try {
      if (fs.existsSync(sessionAuthDir)) {
        fs.rmSync(sessionAuthDir, { recursive: true, force: true });
      }
    } catch (err) {}
  }

  public async logout(ownerId: string) {
    const socket = this.sessions[ownerId];
    if (socket) {
      try {
        await socket.logout();
      } catch (e) {}
      try {
        socket.end();
      } catch (e) {}
      delete this.sessions[ownerId];
    }
    this.sessionStatus[ownerId] = "disconnected";
    this.clearAuth(ownerId);
    this.initializingSessions.delete(ownerId);
    this.initSession(ownerId);
  }

  public async sendMessage(
    ownerId: string,
    phone: string,
    message: string,
    mediaBase64?: string,
  ) {
    const socket = this.sessions[ownerId];
    if (this.sessionStatus[ownerId] !== "connected" || !socket) {
      throw new Error("WhatsApp não está conectado para este Proprietário");
    }

    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) formattedPhone = `55${formattedPhone}`;

    const jid = `${formattedPhone}@s.whatsapp.net`;

    if (mediaBase64) {
      const buffer = Buffer.from(mediaBase64.split(",")[1] || mediaBase64, "base64");
      return socket.sendMessage(jid, { image: buffer, caption: message });
    } else {
      return socket.sendMessage(jid, { text: message });
    }
  }

  public async sendPoll(
    ownerId: string,
    phone: string,
    pollName: string,
    options: string[],
    orderId: string,
  ) {
    const socket = this.sessions[ownerId];
    if (this.sessionStatus[ownerId] !== "connected" || !socket) {
      throw new Error("WhatsApp não está conectado para este Proprietário");
    }

    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) formattedPhone = `55${formattedPhone}`;

    const jid = `${formattedPhone}@s.whatsapp.net`;

    const result = await socket.sendMessage(jid, {
      poll: {
        name: pollName,
        values: options,
        selectableCount: 1,
      },
    });

    if (result?.key && result.message?.messageContextInfo?.messageSecret) {
      this.pollStore[result.key.id] = {
        orderId,
        pollName,
        options,
        messageSecretHex: Buffer.from(result.message.messageContextInfo.messageSecret).toString("hex"),
        creatorJid: jidNormalizedUser(socket.user?.id || jid),
        fullMessage: result,
      };
      this.savePollStore();
    }

    return result;
  }

  public getStatus(ownerId: string) {
    return { status: this.sessionStatus[ownerId] || "disconnected", qr: this.qrDataUrls[ownerId] || null };
  }
}

export const whatsappService = new WhatsAppService();
