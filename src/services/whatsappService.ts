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
  private socket: any = null;
  private qrDataUrl: string | null = null;
  public status: "disconnected" | "qr" | "connected" = "disconnected";
  private authDir = path.join(process.cwd(), "whatsapp_auth_info");
  private pollStorePath = path.join(process.cwd(), "whatsapp_polls.json");
  private pollStore: Record<string, SentPollData> = {};
  private isInitializing = false;
  public onMessageCallback?: (phone: string, text: string) => void;

  constructor() {
    super();
    this.loadPollStore();
    this.init();
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

  private async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      console.log("[WHATSAPP] Iniciando serviço...");

      // Clean up previous socket if any
      if (this.socket) {
        try {
          this.socket.ev.removeAllListeners();
          this.socket.end(undefined);
        } catch (e) {}
        this.socket = null;
      }

      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(
        `[WHATSAPP] Usando Baileys v${version.join(".")}, isLatest: ${isLatest}`,
      );

      this.socket = makeWASocket({
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

      this.socket.ev.on("creds.update", saveCreds);

      this.socket.ev.on(
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
            console.log("[WHATSAPP] QR Code recebido");
            this.status = "qr";
            QRCode.toDataURL(qr)
              .then((url) => {
                this.qrDataUrl = url;
                this.emit("update", {
                  status: this.status,
                  qr: this.qrDataUrl,
                });
              })
              .catch((err) => {
                console.error("[WHATSAPP] Erro ao gerar DataURL do QR:", err);
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
              `[WHATSAPP] Conexão fechada. Código: ${statusCode}, Erro: ${message.substring(0, 100)}... Reconectar: ${shouldReconnect}`,
            );

            this.status = "disconnected";
            this.qrDataUrl = null;
            this.emit("update", { status: this.status });

            if (!shouldReconnect) {
              console.log(
                "[WHATSAPP] Deslogado ou erro fatal. Limpando credenciais...",
              );
              this.clearAuth();
            }

            this.isInitializing = false;
            
            // Reconnect logic with backoff
            if (shouldReconnect) {
              // Delay for server termination/timeouts to allow network to stabilize
              const delay = isServerTerminated ? 5000 : (message.includes("QR refs attempts ended") ? 1000 : 3000);
              console.log(`[WHATSAPP] Aguardando ${delay}ms para reconectar...`);
              setTimeout(() => this.init(), delay);
            }
          } else if (connection === "open") {
            console.log("[WHATSAPP] Conexão estabelecida com sucesso!");
            this.status = "connected";
            this.qrDataUrl = null;
            this.emit("update", { status: this.status });
            this.isInitializing = false;
          }
        },
      );

      this.socket.ev.on("messages.upsert", async (m: any) => {
        if (m.type !== "notify") return;
        for (const msg of m.messages) {
          if (msg.key.fromMe) continue;

          const content = msg.message;

          // Handle Poll Updates
          if (content?.pollUpdateMessage) {
            const update = content.pollUpdateMessage;
            const pollMsgId = update.pollCreationMessageKey?.id;
            
            if (pollMsgId && this.pollStore[pollMsgId]) {
              const context = this.pollStore[pollMsgId];
              try {
                const meId = jidNormalizedUser(this.socket.user?.id);
                const meLid = (this.socket.user as any)?.lid
                  ? jidNormalizedUser((this.socket.user as any)?.lid)
                  : undefined;

                const creationMsgKey = update.pollCreationMessageKey;
                const pollEncKey = Buffer.from(context.messageSecretHex, "hex");

                if (!pollEncKey) {
                  console.log('[WHATSAPP] messageSecret da enquete não encontrado');
                  continue;
                }

                const voterJid = jidNormalizedUser(msg.key.participant || msg.key.remoteJid || '');
                const pollCreatorJid = jidNormalizedUser(context.creatorJid);

                let voteMsg: any = null;
                // Try different combinations of creator and voter JIDs (using LID or PN)
                const combos = [
                  { creator: pollCreatorJid, voter: voterJid },
                ];

                if (meLid) {
                  combos.push({ creator: meLid, voter: voterJid });
                }

                for (const combo of combos) {
                  try {
                    voteMsg = decryptPollVote(update.vote, {
                      pollCreatorJid: combo.creator,
                      pollMsgId: creationMsgKey.id,
                      pollEncKey,
                      voterJid: combo.voter,
                    });
                    if (voteMsg) break;
                  } catch (err) {
                    // Try next combo
                  }
                }

                if (!voteMsg) {
                  console.log('[WHATSAPP] Não foi possível descriptografar o voto.');
                  // Persistent log for debugging in AI Studio
                  try {
                    const debugLog = `[${new Date().toISOString()}] ERRO DECRYPT: Poll ${pollMsgId} | Creator: ${pollCreatorJid} | Voter: ${voterJid} | meLid: ${meLid}\n`;
                    fs.appendFileSync(path.join(process.cwd(), "whatsapp_interaction_logs.txt"), debugLog);
                  } catch (err) {}
                  continue;
                }

                // If we have the full message, we can aggregate
                if (context.fullMessage) {
                  updateMessageWithPollUpdate(context.fullMessage, {
                    pollUpdateMessageKey: msg.key,
                    vote: voteMsg,
                    senderTimestampMs: Number(update.senderTimestampMs || Date.now()),
                  });

                  // Log aggregated results (optional but good for tracking)
                  const aggregated = getAggregateVotesInPollMessage(context.fullMessage, meId);
                  console.log('[WHATSAPP] Resultado agregado da enquete:', aggregated);
                }

                // Identify selected option
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
                    console.log(`[WHATSAPP] Voto identificado: ${selectedOption} para ordem ${context.orderId} do fone ${msg.key.remoteJid}`);
                    this.emit("pollVote", {
                      orderId: context.orderId,
                      option: selectedOption,
                      phone: msg.key.remoteJid?.split("@")[0],
                    });
                    
                    // Persistent log for debugging in AI Studio
                    try {
                      const logLine = `[${new Date().toISOString()}] VOTO: ${selectedOption} | ORDEM: ${context.orderId} | FONE: ${msg.key.remoteJid}\n`;
                      fs.appendFileSync(path.join(process.cwd(), "whatsapp_interaction_logs.txt"), logLine);
                    } catch (err) {}
                  }
                }

                // Save back if we updated fullMessage
                if (context.fullMessage) {
                  this.savePollStore();
                }

              } catch (e) {
                console.error("[WHATSAPP] Erro ao processar voto da enquete", e);
              }
            }
          }
        }
      });
    } catch (err) {
      console.error("[WHATSAPP] Falha na inicialização:", err);
      this.isInitializing = false;
      setTimeout(() => this.init(), 10000);
    }
  }

  private clearAuth() {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        console.log("[WHATSAPP] Pasta de autenticação removida.");
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao remover pasta de autenticação:", err);
    }
  }

  public async logout() {
    console.log("[WHATSAPP] Executando logout...");
    if (this.socket) {
      try {
        await this.socket.logout();
      } catch (e) {}
      try {
        this.socket.end();
      } catch (e) {}
    }
    this.status = "disconnected";
    this.clearAuth();
    this.isInitializing = false;
    this.init();
  }

  public async sendMessage(
    phone: string,
    message: string,
    mediaBase64?: string,
  ) {
    if (this.status !== "connected" || !this.socket) {
      console.warn("[WHATSAPP] Tentativa de envio sem conexão.");
      throw new Error("WhatsApp não está conectado");
    }

    let formattedPhone = phone.replace(/\D/g, "");
    // WhatsApp format: 55119...
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = `55${formattedPhone}`;
    }

    // Handle Ninth Digit for Brazil if missing (heuristic, may not be perfect)
    if (formattedPhone.length === 12 && formattedPhone.startsWith("55")) {
      // DDD is first two after 55
      const ddd = parseInt(formattedPhone.substring(2, 4));
      if (ddd <= 28) {
        // Only some DDDs have 9 digits in specific apps, but standard is all mobile
        // This is complex, usually just use what's provided
      }
    }

    const jid = `${formattedPhone}@s.whatsapp.net`;
    console.log(`[WHATSAPP] Enviando mensagem para ${jid} (original: ${phone})`);

    if (mediaBase64) {
      const buffer = Buffer.from(
        mediaBase64.split(",")[1] || mediaBase64,
        "base64",
      );
      return this.socket.sendMessage(jid, { image: buffer, caption: message });
    } else {
      return this.socket.sendMessage(jid, { text: message });
    }
  }

  public async sendPoll(
    phone: string,
    pollName: string,
    options: string[],
    orderId: string,
  ) {
    if (this.status !== "connected" || !this.socket) {
      console.warn("[WHATSAPP] Tentativa de envio sem conexão.");
      throw new Error("WhatsApp não está conectado");
    }

    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = `55${formattedPhone}`;
    }

    const jid = `${formattedPhone}@s.whatsapp.net`;
    console.log(`[WHATSAPP] Enviando enquete para ${jid}`);

    const result = await this.socket.sendMessage(jid, {
      poll: {
        name: pollName,
        values: options,
        selectableCount: 1,
      },
    });

    if (
      result &&
      result.key &&
      result.message?.messageContextInfo?.messageSecret
    ) {
      this.pollStore[result.key.id] = {
        orderId,
        pollName,
        options,
        messageSecretHex: Buffer.from(
          result.message.messageContextInfo.messageSecret,
        ).toString("hex"),
        creatorJid: result.key.fromMe
          ? jidNormalizedUser(this.socket.user?.id)
          : jidNormalizedUser(jid),
        fullMessage: result, // Store the full message for later aggregation
      };
      this.savePollStore();
    }

    return result;
  }

  public getStatus() {
    return { status: this.status, qr: this.qrDataUrl };
  }
}

export const whatsappService = new WhatsAppService();
