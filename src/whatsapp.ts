import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";

const AUTH_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "auth_info",
);

let socket: WASocket | null = null;
let connecting: Promise<WASocket> | null = null;

function requireWhatsAppNumber(): string {
  const raw = process.env.WHATSAPP_NUMBER;
  if (!raw) {
    throw new Error("Missing environment variable: WHATSAPP_NUMBER");
  }
  return raw.replace(/\D/g, "");
}

function toJid(phoneDigits: string): string {
  return `${phoneDigits}@s.whatsapp.net`;
}

async function createSocket(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const logger = pino({ level: "silent" });

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\nScan this QR code with WhatsApp (Linked Devices):\n");
      qrcode.generate(qr, { small: true });
      console.log("");
    }

    if (connection === "open") {
      console.log("WhatsApp connected.");
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
        ?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.error("WhatsApp logged out. Delete auth_info/ and scan QR again.");
        socket = null;
        connecting = null;
        return;
      }

      console.log("WhatsApp disconnected. Reconnecting...");
      socket = null;
      connecting = createSocket()
        .then((s) => {
          socket = s;
          return s;
        })
        .catch((err: unknown) => {
          connecting = null;
          throw err;
        });
    }
  });

  return sock;
}

export async function connectWhatsApp(): Promise<WASocket> {
  if (socket) {
    return socket;
  }
  if (connecting) {
    return connecting;
  }

  connecting = createSocket().then((sock) => {
    socket = sock;
    return sock;
  });

  const sock = await connecting;
  connecting = null;

  // Wait until the connection is ready before sending.
  await new Promise<void>((resolve, reject) => {
    if (sock.user) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("WhatsApp connection timed out. Scan the QR code."));
    }, 120_000);

    sock.ev.on("connection.update", (update) => {
      if (update.connection === "open") {
        clearTimeout(timeout);
        resolve();
      }
      if (update.connection === "close") {
        const code = (update.lastDisconnect?.error as Boom | undefined)?.output
          ?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          clearTimeout(timeout);
          reject(new Error("WhatsApp logged out."));
        }
      }
    });
  });

  return sock;
}

export async function sendWhatsAppMessage(text: string): Promise<void> {
  const sock = await connectWhatsApp();
  const jid = toJid(requireWhatsAppNumber());
  await sock.sendMessage(jid, { text });
  console.log(`WhatsApp message sent to ${jid}`);
}
