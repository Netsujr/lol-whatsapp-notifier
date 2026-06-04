import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  Browsers,
  type WASocket,
  type WAVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";

const AUTH_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "auth_info",
);

const FALLBACK_WA_VERSION: WAVersion = [2, 3000, 1027934701];
const CONNECT_TIMEOUT_MS = 180_000;

let currentSock: WASocket | null = null;
let connectPromise: Promise<WASocket> | null = null;
let connectionIsOpen = false;

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

function hasSavedSession(): boolean {
  if (!existsSync(AUTH_DIR)) {
    return false;
  }
  return readdirSync(AUTH_DIR).length > 0;
}

function isConnected(sock: WASocket | null): sock is WASocket {
  return (
    sock !== null && sock.user !== undefined && connectionIsOpen
  );
}

async function resolveWaVersion(): Promise<WAVersion> {
  try {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(
      `WhatsApp Web version: ${version.join(".")}${isLatest ? " (latest)" : ""}`,
    );
    return version;
  } catch {
    console.warn(
      `Could not fetch latest WhatsApp version; using fallback ${FALLBACK_WA_VERSION.join(".")}`,
    );
    return FALLBACK_WA_VERSION;
  }
}

function logDisconnect(lastDisconnect: { error?: Error } | undefined): void {
  const boom = lastDisconnect?.error as Boom | undefined;
  const statusCode = boom?.output?.statusCode;
  const message = boom?.message ?? "unknown";
  console.log(`WhatsApp connection closed (code ${statusCode ?? "?"}): ${message}`);
}

async function startWhatsApp(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const version = await resolveWaVersion();
  const logger = pino({ level: "silent" });

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.macOS("Chrome"),
    printQRInTerminal: false,
    connectTimeoutMs: 60_000,
    qrTimeout: 60_000,
    markOnlineOnConnect: false,
  });

  connectionIsOpen = false;
  currentSock = sock;
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\nScan this QR with WhatsApp → Linked devices:\n");
      qrcode.generate(qr, { small: true });
      console.log(
        "\nQR expires in ~60s. If pairing fails, wait for a new QR (do not restart).\n",
      );
    }

    if (connection === "open") {
      connectionIsOpen = true;
      console.log("WhatsApp connected.");
    }

    if (connection === "close") {
      connectionIsOpen = false;
      logDisconnect(lastDisconnect);

      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
        ?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        console.error(
          "Logged out. Delete auth_info/ and run again to scan a new QR.",
        );
        currentSock = null;
        connectPromise = null;
        connectionIsOpen = false;
        return;
      }

      if (statusCode === DisconnectReason.connectionReplaced) {
        console.error(
          "Another WhatsApp Web session took over (conflict). " +
            "Stop other instances (pm2, npm run dev, test scripts) and close " +
            "web.whatsapp.com in the browser, then restart this app once.",
        );
        currentSock = null;
        connectPromise = null;
        return;
      }

      const shouldReconnect =
        statusCode === DisconnectReason.restartRequired ||
        statusCode === DisconnectReason.timedOut ||
        (hasSavedSession() &&
          statusCode !== DisconnectReason.connectionReplaced);

      if (shouldReconnect) {
        console.log("Reconnecting in 3s...");
        currentSock = null;
        setTimeout(() => {
          connectPromise = bootWhatsApp();
        }, 3000);
      }
    }
  });

  return sock;
}

/** Waits until any socket in this process is fully logged in. */
function waitUntilLoggedIn(): Promise<WASocket> {
  if (isConnected(currentSock)) {
    return Promise.resolve(currentSock);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          "WhatsApp connection timed out. Scan the QR code or check auth_info/.",
        ),
      );
    }, CONNECT_TIMEOUT_MS);

    const tick = setInterval(() => {
      if (isConnected(currentSock)) {
        clearTimeout(timeout);
        clearInterval(tick);
        resolve(currentSock);
      }
    }, 200);
  });
}

function bootWhatsApp(): Promise<WASocket> {
  return startWhatsApp().then(() => waitUntilLoggedIn());
}

export async function connectWhatsApp(): Promise<WASocket> {
  if (isConnected(currentSock)) {
    return currentSock;
  }

  if (!connectPromise) {
    connectPromise = bootWhatsApp();
  }

  try {
    return await connectPromise;
  } catch (error) {
    connectPromise = null;
    throw error;
  }
}

export async function sendWhatsAppMessage(text: string): Promise<void> {
  const sock = await connectWhatsApp();
  const jid = toJid(requireWhatsAppNumber());
  await sock.sendMessage(jid, { text });
  console.log(`WhatsApp message sent to ${jid}`);
}
