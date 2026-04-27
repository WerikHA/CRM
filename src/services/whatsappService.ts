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

const logger = pino({ level: "warn" });
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
  private sessionError: Record<string, { message: string, action: string } | null> = {};
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

  private logInteraction(ownerId: string, message: string) {
    try {
      const logPath = path.join(process.cwd(), "whatsapp_interaction_logs.txt");
      const timestamp = new Date().toLocaleString("pt-BR");
      const logLine = `[${timestamp}][Owner: ${ownerId}] ${message}\n`;
      fs.appendFileSync(logPath, logLine);
    } catch (err) {
      console.error("[WHATSAPP] Erro ao gravar log:", err);
    }
  }

  public async initSession(ownerId: string) {
    if (!ownerId) return;
    if (this.initializingSessions.has(ownerId)) {
      console.log(`[WHATSAPP] Sessão ${ownerId} já está em inicialização...`);
      return;
    }
    this.initializingSessions.add(ownerId);

    const sessionAuthDir = path.join(this.authBaseDir, `auth_${ownerId}`);

    try {
      console.log(`[WHATSAPP] Iniciando sessão para Owner: ${ownerId}...`);

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
      
      let version: any = [2, 3000, 1017531234]; // Updated fallback version
      try {
        const { version: latestVersion, isLatest } = await fetchLatestBaileysVersion();
        version = latestVersion;
        console.log(`[WHATSAPP] Usando versão Baileys: ${version.join(".")} (Latest: ${isLatest})`);
      } catch (err) {
        console.error("[WHATSAPP] Erro ao buscar versão do Baileys, usando fallback:", err);
      }

      const socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        browser: ["Amplifica", "Chrome", "1.0.0"],
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
            const statusCode = (error as any)?.output?.statusCode || error?.code;
            const message = error?.message || error?.stack || "";
            
            // Reasons that definitely mean we shouldn't reconnect automatically without clearing
            const isLogout = statusCode === DisconnectReason.loggedOut || 
                             statusCode === 401 || 
                             statusCode === 403;
            
            // Reasons that should trigger a reconnect
            const shouldReconnect = !isLogout;

            console.log(
              `[WHATSAPP] Conexão FECHADA para ${ownerId}. Status: ${statusCode}. Reconnect: ${shouldReconnect}. Erro: ${message}`,
            );

            // Set detailed error for the UI
            if (statusCode === DisconnectReason.loggedOut) {
              this.sessionError[ownerId] = {
                message: "Você foi desconectado pelo próprio WhatsApp.",
                action: "Por favor, escaneie o QR Code novamente para reconectar."
              };
            } else if (statusCode === 401 || message.includes("conflict")) {
              this.sessionError[ownerId] = {
                message: "Conflito de Sessão: Esta conta foi conectada em outro dispositivo ou a sessão expirou.",
                action: "Clique em 'Sair / Desconectar' e escaneie o código novamente."
              };
            } else if (statusCode === 428 || message.includes("Connection Closed")) {
              this.sessionError[ownerId] = {
                message: "A conexão com o servidor do WhatsApp foi interrompida inesperadamente.",
                action: "Estamos tentando reconectar automaticamente. Se persistir, reinicie o CRM."
              };
            } else if (statusCode === 515 || message.includes("Stream Errored")) {
              this.sessionError[ownerId] = {
                message: "Erro de Fluxo (Stream Errored): Ocorreu uma instabilidade na comunicação com o WhatsApp.",
                action: "Aguarde alguns segundos, estamos reiniciando a conexão."
              };
            } else {
              this.sessionError[ownerId] = {
                message: `Erro de Conexão (${statusCode || 'Desconhecido'}): ${message.substring(0, 50)}...`,
                action: "Tente recarregar a página ou reconectar seu WhatsApp."
              };
            }

            // Handle specific Baileys error conditions
            if (statusCode === 515 || message.includes("Stream Errored") || message.includes("conflict")) {
              console.warn(`[WHATSAPP] Erro de Conflito ou Stream persistente detectado para ${ownerId}.`);
            }

            this.sessionStatus[ownerId] = "disconnected";
            this.qrDataUrls[ownerId] = null;
            this.initializingSessions.delete(ownerId);
            this.emit("update", { ownerId, status: this.sessionStatus[ownerId] });

            if (shouldReconnect) {
              // Exponential-ish backoff or specific delays
              const delay = (statusCode === 515 || statusCode === 428) ? 10000 : 5000;
              console.log(`[WHATSAPP] Agendando reconexão para ${ownerId} em ${delay/1000}s...`);
              setTimeout(() => this.initSession(ownerId), delay);
            } else {
              console.log(`[WHATSAPP] Logout ou Falha Crítica detectada para ${ownerId}. Limpando sessão.`);
              this.clearAuth(ownerId);
              if (this.sessions[ownerId]) {
                try {
                  this.sessions[ownerId].ev.removeAllListeners();
                  this.sessions[ownerId].end(undefined);
                } catch (e) {}
                delete this.sessions[ownerId];
              }
            }
          } else if (connection === "open") {
            console.log(`[WHATSAPP] Conexão ABERTA com sucesso para ${ownerId}!`);
            this.logInteraction(ownerId, "WhatsApp Conectado.");
            this.sessionStatus[ownerId] = "connected";
            this.sessionError[ownerId] = null;
            this.qrDataUrls[ownerId] = null;
            this.initializingSessions.delete(ownerId);
            this.emit("update", { ownerId, status: this.sessionStatus[ownerId] });
          }
        },
      );

      socket.ev.on("messages.upsert", async (m: any) => {
        if (m.type !== "notify") return;
        for (const msg of m.messages) {
          if (msg.key.fromMe) continue;
          
          const getRealContent = (m: any): any => {
            if (!m) return null;
            if (m.viewOnceMessage?.message) return getRealContent(m.viewOnceMessage.message);
            if (m.viewOnceMessageV2?.message) return getRealContent(m.viewOnceMessageV2.message);
            if (m.ephemeralMessage?.message) return getRealContent(m.ephemeralMessage.message);
            if (m.deviceSentMessage?.message) return getRealContent(m.deviceSentMessage.message);
            return m;
          };

          const realContent = getRealContent(msg.message);
          if (!realContent) continue;

          const keys = Object.keys(realContent || {});
          
          // Debugging keys to logs
          if (keys.length > 0 && !realContent.pollUpdateMessage) {
             this.logInteraction(ownerId, `Msg de ${msg.key.remoteJid}: Chaves=[${keys.join(",")}]`);
          }

          if (realContent.pollUpdateMessage || realContent.pollUpdateMessageV2) {
            const update = realContent.pollUpdateMessage || realContent.pollUpdateMessageV2;
            const pollMsgId = update.pollCreationMessageKey?.id;
            this.logInteraction(ownerId, `PollUpdate Detectada! ID=${pollMsgId}`);
            
            if (pollMsgId && this.pollStore[pollMsgId]) {
              const context = this.pollStore[pollMsgId];
              this.logInteraction(ownerId, `Contexto encontrado para arte: ${context.orderId}`);
              try {
                const meId = jidNormalizedUser(socket.user?.id || '');
                const meLid = (socket.user as any)?.lid ? jidNormalizedUser((socket.user as any)?.lid) : undefined;
                const pollEncKey = context.messageSecretHex ? Buffer.from(context.messageSecretHex, "hex") : null;

                if (!pollEncKey) {
                  this.logInteraction(ownerId, `ERRO: Secret faltando para ${pollMsgId}`);
                  continue;
                }

                const voterJid = jidNormalizedUser(msg.key.participant || msg.key.remoteJid || '');
                const creators = [jidNormalizedUser(context.creatorJid), meId];
                if (meLid) creators.push(meLid);
                
                const voters = [voterJid];
                if (msg.key.participant) voters.push(jidNormalizedUser(msg.key.participant));

                const uniqueCreators = [...new Set(creators.filter(Boolean))];
                const uniqueVoters = [...new Set(voters.filter(Boolean))];

                let voteMsg: any = null;
                for (const creator of uniqueCreators as string[]) {
                  for (const voter of uniqueVoters as string[]) {
                    try {
                      voteMsg = decryptPollVote(update.vote, {
                        pollCreatorJid: creator,
                        pollMsgId: pollMsgId,
                        pollEncKey,
                        voterJid: voter,
                      });
                      if (voteMsg) break;
                    } catch (err) {}
                  }
                  if (voteMsg) break;
                }

                if (!voteMsg) {
                  this.logInteraction(ownerId, `ERRO: Falha ao descriptografar voto da enquete ${pollMsgId}.`);
                  continue;
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
                    this.logInteraction(ownerId, `VOTO RECONHECIDO: ${selectedOption}`);
                    this.emit("pollVote", {
                      ownerId,
                      orderId: context.orderId,
                      option: selectedOption,
                      phone: msg.key.remoteJid?.split("@")[0],
                    });
                  } else {
                    this.logInteraction(ownerId, `Hash de voto não mapeado: ${selectedHash}`);
                  }
                }

                // Persistir voto no context para histórico
                if (context.fullMessage) {
                  updateMessageWithPollUpdate(context.fullMessage, {
                    pollUpdateMessageKey: msg.key,
                    vote: voteMsg,
                    senderTimestampMs: Number(update.senderTimestampMs || Date.now()),
                  });
                  this.savePollStore();
                }
              } catch (e: any) {
                this.logInteraction(ownerId, `Erro ao processar voto: ${e.message}`);
              }
            } else {
               this.logInteraction(ownerId, `Enquete ID ${pollMsgId} não está no cache local.`);
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

  public async reload(ownerId: string) {
    const socket = this.sessions[ownerId];
    if (socket) {
      try {
        socket.end();
      } catch (e) {}
      delete this.sessions[ownerId];
    }
    this.sessionStatus[ownerId] = "disconnected";
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

    this.logInteraction(ownerId, `Enviando mensagem para ${phone}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);

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

    this.logInteraction(ownerId, `Enviando enquete para ${phone}: ${pollName}`);

    const result = await socket.sendMessage(jid, {
      poll: {
        name: pollName,
        values: options,
        selectableCount: 1,
      },
    });

    console.log(`[WHATSAPP] Enquete enviada. ID: ${result?.key?.id}`);

    if (result?.key && result.message?.messageContextInfo?.messageSecret) {
      console.log(`[WHATSAPP] Secret da enquete encontrado e salvo.`);
      this.pollStore[result.key.id] = {
        orderId,
        pollName,
        options,
        messageSecretHex: Buffer.from(result.message.messageContextInfo.messageSecret).toString("hex"),
        creatorJid: jidNormalizedUser(socket.user?.id || jid),
        fullMessage: result,
      };
      this.savePollStore();
    } else {
      console.warn(`[WHATSAPP] AVISO: Secret da enquete NÃO encontrado no resultado do envio. Votos nesta enquete podem falhar na descriptografia.`);
      // Se não houver secret, ainda salvamos o que dá, mas a descriptografia vai falhar.
      this.pollStore[result?.key?.id || 'unknown'] = {
        orderId,
        pollName,
        options,
        messageSecretHex: "",
        creatorJid: jidNormalizedUser(socket.user?.id || jid),
        fullMessage: result,
      };
      this.savePollStore();
    }

    return result;
  }

  public getStatus(ownerId: string) {
    if (!this.sessions[ownerId] && !this.initializingSessions.has(ownerId)) {
      this.initSession(ownerId).catch(err => console.error(`[WHATSAPP] Failed to auto-init session for ${ownerId}:`, err));
    }
    return { 
      status: this.sessionStatus[ownerId] || "disconnected", 
      qr: this.qrDataUrls[ownerId] || null,
      error: this.sessionError[ownerId] || null
    };
  }
}

export const whatsappService = new WhatsAppService();
